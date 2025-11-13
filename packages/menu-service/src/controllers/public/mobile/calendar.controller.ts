
import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { ListCalendarQuerySchemaType } from "@/validator/mobile/calendar.validator";
import { getMenuPlansCalendar } from "@/services/repositories/mobile/menu.calendar.service";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date()
});


export const listCalendar = catchAsync(async (c: Context) => {

  const query = await c.get("validatedData").query as ListCalendarQuerySchemaType;
  const param = await c.get("validatedData").param;

  const page = parseInt(String(query.page || 1));
  const limit = parseInt(String(query.limit || 10));
  const startDate = query.startDate || null;
  const endDate = query.endDate || null;
  const entityType = param.entity || null;

  const audit = getAuditFields(c);

  const data = await getMenuPlansCalendar({
    limit,
    page,
    driversIds: audit.driverId,
    kitchenIds: audit.kitchenId,
    schoolIds: audit.beneficiaryId,
    endDate,
    startDate,
    entityType
  });
  return c.json({ data: data.data, meta: data.meta }, 200);
});