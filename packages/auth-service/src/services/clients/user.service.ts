import { enqueueRetry, processRetryQueue } from "@/utils/retryQueue";
import { callWithBreaker } from "@/utils/circuitBreaker";
import axios, { AxiosRequestConfig } from "axios";
import { isAxiosError } from "axios";
import { HTTPException } from "hono/http-exception";
import { errorConverter } from "@/middleware/error.middleware";

const USER_SERVICE_BASE = process.env.USER_SERVICE_URL || "http://user-service:3001/api";
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || "secret";
const SERVICE_NAME = "user-service";

if (!USER_SERVICE_BASE || !SERVICE_TOKEN) {
  throw new Error("Missing required environment variables: USER_SERVICE_URL or SERVICE_TOKEN");
}

const safeRequest = async (path: string, method: AxiosRequestConfig['method'], data?: any) => {
  return callWithBreaker(async () => {
    const config: AxiosRequestConfig = {
      method: method,
      url: `${USER_SERVICE_BASE}${path}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${SERVICE_TOKEN}`,
      },
      data: (method === 'POST' || method === 'PUT' || method === 'PATCH') ? data : undefined,
      params: (method === 'GET' || method === 'DELETE') ? data : undefined,
    };

    const res = await axios(config);

    return res?.data?.data || null;
  }, { serviceName: SERVICE_NAME });
};


const requestWithRetry = async (
  idPrefix: string,
  fnName: string,
  path: string,
  method: AxiosRequestConfig['method'],
  payload: any
) => {
  try {
    return await safeRequest(path, method, payload);
  } catch (error) {
    await enqueueRetry({
      id: `${idPrefix}:${Date.now()}`,
      data: { fn: fnName, payload: payload },
      maxAttempts: 5,
      backoffMs: 2000,
    });

    const { statusCode, message } = await errorConverter(error);
    throw new HTTPException(statusCode, { message });
  }
};


export const getUserInfoServiceClient = (data: { username?: string; }) => {
  return requestWithRetry(
    "getUserInfoServiceClient",
    "getUserInfoServiceClient",
    "/private/user/user-info",
    "POST",
    data
  );
};

export const updateUserPasswordServiceClient = (data: { id?: string, password?: string; }) => {
  return requestWithRetry(
    "updateUserPasswordServiceClient",
    "updateUserPasswordServiceClient",
    "/private/user/update-password",
    "POST",
    data
  );
};

export const saveTokenServiceClient = (userId: string, token: string, expiresAt: number, ipAddress: string, deviceInfo: string) => {
  const payload = { userId, token, expiresAt, ipAddress, deviceInfo };
  return requestWithRetry(
    "saveTokenServiceClient",
    "saveTokenServiceClient",
    "/private/user/save-token",
    "POST",
    payload
  );
};

export const revokeRefreshTokenServiceClient = (refreshToken: string, isDeleted: boolean) => {
  const payload = { refreshToken, isDeleted: isDeleted };
  return requestWithRetry(
    "revokeRefreshTokenServiceClient",
    "revokeRefreshTokenServiceClient",
    "/private/user/revoke-refresh-token",
    "POST",
    payload
  );
};

export const validateRefreshTokenServiceClient = (refreshToken: string) => {
  const payload = { refreshToken };
  return requestWithRetry(
    "validateRefreshTokenServiceClient",
    "validateRefreshTokenServiceClient",
    "/private/user/validate-refresh-token",
    "POST",
    payload
  );
};

export const createUserServiceClient = (data: { domainId: string, isActive: boolean, email: string; password: string; roleId: string; updatedAt: Date; address: string, dateOfBirth: Date, firstName: string, lastName: string, phoneNumber: string, createdBy: string; }) => {
  return requestWithRetry(
    "createUserServiceClient",
    "createUserServiceClient",
    "/private/user/create-user",
    "POST",
    data
  );
};

export const startUserServiceRetryWorker = async (stopSignal?: () => boolean) => {
  await processRetryQueue(async (jobData: any) => {
    const { fn, payload } = jobData;

    let path: string;
    let method: AxiosRequestConfig['method'] = 'POST';
    let data: any = payload;

    switch (fn) {
      case "getUserInfoServiceClient":
        path = "/private/user/user-info";
        break;
      case "saveTokenServiceClient":
        path = "/private/user/save-token";
        data.expiresAt = new Date(payload.expiresAt);
        break;
      case "revokeRefreshTokenServiceClient":
        path = "/private/user/revoke-refresh-token";
        break;
      case "validateRefreshTokenServiceClient":
        path = "/private/user/validate-refresh-token";
        break;
      case "createUserServiceClient":
        path = "/private/user/create-user";
        break;
      default:
        console.error("[Retry] Unknown job function:", fn);
        return;
    }

    await safeRequest(path, method, data);

  }, { stopSignal });
};