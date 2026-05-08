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


export const getUserRolePermissonsClientService = (data: { roleId: string; }) => {
  return requestWithRetry(
    "getUserRolePermissons",
    "getUserRolePermissons",
    `/private/role/${data.roleId}/permissions`,
    "GET",
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
      case "getUserRolePermissons":
        path = `/private/role/${data.roleId}/permissions`;
        method = "GET";
        break;
      default:
        console.error("[Retry] Unknown job function:", fn);
        return;
    }

    await safeRequest(path, method, data);

  }, { stopSignal });
};