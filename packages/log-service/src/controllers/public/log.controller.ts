import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  getAppLogsList,
  getTokenLogsList,
  LogLevel,
  AppLogListParams,
  TokenLogListParams
} from "@/services/repositories/log.service";
export const listAppLogsHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();

  const params: AppLogListParams = {
    page: parseInt(query.page || '1'),
    limit: parseInt(query.limit || '10'),
    userId: query.userId,
    level: query.level as LogLevel,
    ipAddress: query.ipAddress,
    startDate: query.startDate,
    endDate: query.endDate
  };

  const data = await getAppLogsList(params);

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const listTokenLogsHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();

  const params: TokenLogListParams = {
    page: parseInt(query.page || '1'),
    limit: parseInt(query.limit || '10'),
    userId: query.userId,
    tokenId: query.tokenId,
    eventType: query.eventType,
    ipAddress: query.ipAddress,
    success: query.success ? (query.success.toLowerCase() === 'true') : undefined,
  };

  const data = await getTokenLogsList(params);

  return c.json({ data: data.data, meta: data.meta }, 200);
});