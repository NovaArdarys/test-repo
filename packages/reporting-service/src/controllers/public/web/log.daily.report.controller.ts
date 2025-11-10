import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { stepReportQuerySchema } from "@/validator/daily.report.validator";
import { getStepReportById, getStepReportsWithFilter } from "@/services/repositories/read.report.daily.service";
import z from "zod";

export const getStepReportsHandler = catchAsync(async (c: Context) => {
  const query = c.get("validatedData").query;
  const { startDate, endDate, search, entity, page, limit } = query as z.infer<typeof stepReportQuerySchema>;

  const results = await getStepReportsWithFilter({
    startDate,
    endDate,
    search,
    entity,
    page,
    limit,
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

