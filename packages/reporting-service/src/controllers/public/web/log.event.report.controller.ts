import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { getEventReportById, getEventReportsWithFilter } from "@/services/repositories/log.event.report.service";

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
  const audit = getAuditFields(c);

  const result = await getEventReportsWithFilter({
    ...query, kitchenIds: audit.kitchenId,
  });

  return c.json({
    success: true,
    message: "OK",
    data: result.data,
    meta: result.meta,
  });
});