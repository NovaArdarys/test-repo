import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { RecordLocationSchemaType } from "@/validator/delivery.validator";
import { getDriverLocationHistoryByDeliveryId, recordDriverLocation } from "@/services/repositories/driver.location.service"; // Asumsi service pelacakan

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  schoolId: c.get("schoolId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date()
});

export const recordDriverLocationHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as RecordLocationSchemaType;
  const { createdBy } = getAuditFields(c);

  const newLocation = await recordDriverLocation({
    ...body,
    createdBy,
  });

  return c.json({ data: newLocation, message: "Location recorded" }, 201);
});

export const listDeliveryLocationsHandler = catchAsync(async (c: Context) => {
  const { id: deliveryId } = c.req.param();

  const history = await getDriverLocationHistoryByDeliveryId(deliveryId);

  return c.json({ data: history }, 200);
});