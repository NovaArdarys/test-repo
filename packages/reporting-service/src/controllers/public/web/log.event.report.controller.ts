import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { getEventReportById, getEventReportsWithFilter } from "@/services/repositories/log.event.report.service";

export const getEventReportByIdHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");

  if (!id) {
    return c.json({ success: false, message: "eventId diperlukan" }, 400);
  }

  const result = await getEventReportById(id);

  if (!result) {
    return c.json({ success: false, message: "Event report tidak ditemukan" }, 404);
  }

  return c.json({
    success: true,
    message: "OK",
    data: result,
  });
});

export const getEventReportsHandler = catchAsync(async (c: Context) => {
  const query = c.get("validatedData").query;

  const result = await getEventReportsWithFilter(query);

  return c.json({
    success: true,
    message: "OK",
    data: result.data,
    meta: result.meta,
  });
});