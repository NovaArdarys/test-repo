import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { BulkRecordLocationSchemaType, RecordLocationSchemaType } from "@/validator/delivery.validator";
import { getDriverLocationHistoryByDeliveryId, createDriverLocationService, createBulkDriverLocationsService } from "@/services/repositories/mobile/driver.location.service"; // Asumsi service pelacakan

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

export const createBulkLocationHandler = catchAsync(async (c: Context) => {
  const body = await c.get("validatedData")?.body as BulkRecordLocationSchemaType;

  const { createdBy, updatedAt, updatedBy, createdAt } = getAuditFields(c);
  const { id: deliveryId } = c.req.param();

  const newData = body.map((item) => {
    return {
      ...item, deliveryId: deliveryId,
    };
  });

  const result = await createBulkDriverLocationsService(newData, { createdBy, updatedAt, updatedBy, createdAt });

  return c.json({ data: result, message: "Bulk location recorded" }, 201);
});

export const createSingleLocationHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as RecordLocationSchemaType;
  const { createdBy } = getAuditFields(c);
  const { id: deliveryId } = c.req.param();

  const newLocation = await createDriverLocationService({
    ...body,
    deliveryId: deliveryId,
    createdBy,
  });

  return c.json({ data: newLocation, message: "Location recorded" }, 201);
});

export const listLocationsByDeliveryHandler = catchAsync(async (c: Context) => {
  const { id: deliveryId } = c.req.param();

  const history = await getDriverLocationHistoryByDeliveryId(deliveryId);

  return c.json({ data: history }, 200);
});