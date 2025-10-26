import { type Context, type Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { errorConverter } from "@/middleware/error.middleware";
import ApiError from "@/utils/ApiError";
import { parseDeviceInfo } from "./device.util";
import { sendAppLog } from "@/messaging/publishers/log.publisher";
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

const getLogMetadata = async (c: Context) => {
  const deviceInfo = parseDeviceInfo(c);

  const userId = c.get('userId') as string | undefined;

  const url = c.req.url;
  const method = c.req.method;
  const path = new URL(url).pathname;

  return {
    userId: userId || 'anonymous',
    ipAddress: deviceInfo.ip,
    userAgent: deviceInfo.userAgent,

    path: `${method} ${path}`,
    device: {
      type: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
    }
  };
};

const logRequestActivity = async (
  c: Context,
  level: LogLevel,
  message: string,
  errorStack: string | undefined = undefined
) => {
  const metadata = await getLogMetadata(c);

  const payload = {
    userId: metadata.userId,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    message: message,
    level: level,
    path: metadata.path,

    payload: {
      device: metadata.device,
      queryParams: c.req.query(),
      params: c.req.param(),
      errorStack: errorStack,
    }
  };

  await sendAppLog(level, payload);
};

export const catchAsync = <T>(fn: (c: Context, next: Next) => T) => async (c: Context, next: Next) => {
  const start = Date.now();

  try {
    const result = await fn(c, next) as T;

    const duration = Date.now() - start;

    const responseStatus = c.res.status || 200;
    if (responseStatus >= 200 && responseStatus < 300) {
      await logRequestActivity(
        c,
        'INFO' as LogLevel,
        `SUCCESS | ${c.req.method} ${new URL(c.req.url).pathname} completed in ${duration}ms`
      );
    }


    return result as T extends Promise<infer U> ? U : T;
  } catch (error: any) {
    // if (error instanceof ApiError) {
    //   const { message, statusCode } = await errorConverter({ message: error.message, statusCode: error.statusCode });
    //   throw new HTTPException(statusCode, { message });
    // } else {
    //   const { message, statusCode } = await errorConverter(error);
    //   throw new HTTPException(statusCode, { message });
    // }


    let logMessage: string;
    let logStatusCode: number;
    let stack: string | undefined;

    if (error instanceof ApiError) {
      const { statusCode, message } = await errorConverter({ message: error.message, statusCode: error.statusCode });
      logStatusCode = statusCode;
      logMessage = `API_ERROR | ${error.message}`;
      stack = error.stack;

      throw new HTTPException(statusCode, { message: message });

    } else if (error instanceof HTTPException) {
      logStatusCode = error.status;
      logMessage = `HTTP_EXCEPTION | ${error.message}`;
      stack = error.stack;

      await logRequestActivity(
        c,
        logStatusCode >= 500 ? 'ERROR' as LogLevel : 'WARN' as LogLevel,
        `${logStatusCode} | ${logMessage}`,
        stack
      );
      throw error;

    } else {
      const { statusCode, message } = await errorConverter(error);
      logStatusCode = statusCode;
      logMessage = `FATAL_ERROR | ${message}`;
      stack = error.stack;

      await logRequestActivity(
        c,
        logStatusCode >= 500 ? 'ERROR' as LogLevel : 'WARN' as LogLevel,
        `${logStatusCode} | ${logMessage}`,
        stack
      );
      throw new HTTPException(statusCode, { message: message });
    }

  }
};