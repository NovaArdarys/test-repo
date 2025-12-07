import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { stepReportQuerySchema } from "@/validator/daily.report.validator";
import { getStepReportById, getStepReportsWithFilter } from "@/services/repositories/log.report.daily.service";
import z from "zod";
import { getGroupDailyReportDetailService, getGroupDailyReportService } from "@/services/repositories/web/log.report.daily.grouped.service";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  domain: c.get('domain'),
  subDomain: c.get('subDomain'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date(),
  isAppManager: c.get("isAppManager") as boolean,
});


export const getStepReportsHandler = catchAsync(async (c: Context) => {
  const query = c.get("validatedData").query;
  const { startDate, endDate, search, entity, page, limit } = query as z.infer<typeof stepReportQuerySchema>;

  const audit = getAuditFields(c);
  const results = await getStepReportsWithFilter({
    startDate,
    endDate,
    search,
    entity,
    page,
    limit,
    kitchenIds: audit.kitchenId,
    isAppManager: audit.isAppManager
  });

  return c.json({
    data: results.data,
    meta: results.meta
  });
});

export const getStepReportByIdHandler = catchAsync(async (c: Context) => {
  const param = c.get("validatedData").param;

  const result = await getStepReportById(param.id);

  if (!result) {
    return c.json({ success: false, message: "Step report tidak ditemukan" }, 404);
  }

  return c.json({
    success: true,
    data: result,
  });
});





export const getGroupStepReportsHandler = catchAsync(async (c: Context) => {
  const query = c.get("validatedData").query;
  const { startDate, endDate, search, entity, page, limit } = query as z.infer<typeof stepReportQuerySchema>;

  const audit = getAuditFields(c);
  const results = await getGroupDailyReportService({
    startDate,
    endDate,
    search,
    entity,
    page,
    limit,
    kitchenIds: audit.kitchenId,
    isAppManager: audit.isAppManager
  });

  return c.json({
    data: results.data,
    meta: results.meta
  });
});

export const getGroupedStepReportByItemHandler = catchAsync(async (c: Context) => {
  const param = c.get("validatedData").param;

  const result = await getGroupDailyReportDetailService(param.id);

  if (!result) {
    return c.json({ success: false, message: "Step report tidak ditemukan" }, 404);
  }

  return c.json({
    success: true,
    data: result,
  });
});

