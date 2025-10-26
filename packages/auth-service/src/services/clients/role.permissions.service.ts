import { enqueueRetry, processRetryQueue } from "@/utils/retryQueue";
import { callWithBreaker } from "@/utils/circuitBreaker";
import axios, { AxiosRequestConfig } from "axios";
import { isAxiosError } from "axios";

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
  } catch (err) {
    await enqueueRetry({
      id: `${idPrefix}:${Date.now()}`,
      data: { fn: fnName, payload: payload },
      maxAttempts: 5,
      backoffMs: 2000,
    });



    if (isAxiosError(err)) {
      console.log(err.response, "-----err-----");
      const status = err.response?.status || 500;
      const apiError = err.response?.data || {
        error: "Upstream Service Error",
        message: err.message,
      };

      const formattedError = new Error(apiError.error || apiError.message || "Unknown Error");
      (formattedError as any).status = status;
      (formattedError as any).details = apiError.details || null;

      throw formattedError;
    }

    throw err;
  }
};


export const getUserRolePermissonsClientService = (data: { roleId: string; }) => {
  return requestWithRetry(
    "getUserRolePermissons",
    "getUserRolePermissons",
    `/private/role/${data.roleId}/permissons`,
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
      case "getUserRolePermissons":
        path = `/private/role/${data.roleId}/permissons`;
        break;
      default:
        console.error("[Retry] Unknown job function:", fn);
        return;
    }

    await safeRequest(path, method, data);

  }, { stopSignal });
};