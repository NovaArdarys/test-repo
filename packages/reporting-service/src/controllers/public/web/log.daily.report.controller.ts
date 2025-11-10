import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { stepReportQuerySchema } from "@/validator/daily.report.validator";
import { getStepReportsWithFilter } from "@/services/repositories/read.report.daily.service";
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
