import { enqueueRetry, processRetryQueue } from "@/utils/retryQueue";
import { callWithBreaker } from "@/utils/circuitBreaker";
import axios, { AxiosRequestConfig } from "axios";
import { isAxiosError } from "axios";

const USER_SERVICE_BASE = process.env.SCHOOL_SERVICE_URL || "http://school-service:3010/api";
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || "secret";
const SERVICE_NAME = "school-service";

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
    console.log(err, "-----err-----");

    await enqueueRetry({
      id: `${idPrefix}:${Date.now()}`,
      data: { fn: fnName, payload: payload },
      maxAttempts: 5,
      backoffMs: 2000,
    });



    if (isAxiosError(err)) {
      const status = err.response?.status || 500;
      const apiError = err.response?.data || {
        error: "Upstream Service Error",
        message: err.message,
      };
      console.log(err.response?.data, "-----err-----");

      const formattedError = new Error(apiError.error || apiError.message || "Unknown Error");
      (formattedError as any).status = status;
      (formattedError as any).details = apiError.details || null;

      throw formattedError;
    }

    throw err;
  }
};

export const updateSchoolServiceClient = (data: { data?: Array<string>; kitchenId?: string; userId: string; }) => {
  return requestWithRetry(
    "updateSchoolServiceClient",
    "updateSchoolServiceClient",
    "/private/schools",
    "PATCH",
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
      case "updateSchoolServiceClient":
        path = "/private/schools";
        break;
      default:
        console.error("[Retry] Unknown job function:", fn);
        return;
    }

    await safeRequest(path, method, data);

  }, { stopSignal });
};