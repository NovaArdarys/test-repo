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
  errorStack: string | undefined = undefined,
) => {
  const metadata = await getLogMetadata(c);

  const responseData =
    c.req.method !== "GET" ? c.get("responseData") : undefined;

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
      body: await c.get("validatedData")?.body || {},
      errorStack: errorStack,
      response: responseData,
    }
  };

  await sendAppLog(level, payload);
};

export function catchAsync<
  Fn extends (c: any, next: Next) => Promise<any> | any
>(fn: Fn) {
  return (async (
    c: Parameters<Fn>[0],
    next: Next
  ): Promise<Awaited<ReturnType<Fn>>> => {
    const start = Date.now();
    const originalJson = c.json.bind(c);
    c.json = (data: any, status?: number) => {
      c.set("responseData", data);
      return originalJson(data, status);
    };

    const originalText = c.text.bind(c);
    c.text = (data: string, status?: number) => {
      c.set("responseData", data);
      return originalText(data, status);
    };
    try {
      const result = await fn(c, next);
      const duration = Date.now() - start;

      const responseStatus = c.res.status || 200;
      if (responseStatus >= 200 && responseStatus < 300) {
        await logRequestActivity(
          c,
          "INFO",
          `SUCCESS | ${c.req.method} ${new URL(c.req.url).pathname} completed in ${duration}ms`
        );
      }

      return result;
    } catch (error: any) {
      let logMessage: string;
      let logStatusCode: number;
      let stack: string | undefined;

      const { statusCode, message } = await errorConverter(error);
      console.log(error, "==== catch async =====", statusCode, message);

      logStatusCode = statusCode;
      logMessage = `FATAL_ERROR | ${message}`;
      stack = error.stack;

      await logRequestActivity(
        c,
        logStatusCode >= 500 ? "ERROR" : "WARN",
        `${logStatusCode} | ${logMessage}`,
        stack
      );

      throw new HTTPException(statusCode, { message });
    }
  }) as typeof fn;
}