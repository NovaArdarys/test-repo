import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  DeliverySchoolCreatebodySchemaType,
  DeliverySchoolListQueryType,
  DeliverySchoolUpdateType,
  UpdateDeliverySchoolStatusSchemaType,
} from "@/validator/delivery.school.validation";
import { assignSchoolToDelivery, getDeliverySchoolById, getDeliverySchoolsList, softDeleteDeliverySchool, updateDeliverySchool, updateDeliverySchoolStatusById } from "@/services/repositories/delivery.schools.service";

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

export const listDeliverySchoolsHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as DeliverySchoolListQueryType;

  const page = parseInt(String(query.page || '1'));
  const limit = parseInt(String(query.limit || '10'));

  const data = await getDeliverySchoolsList({
    page,
    limit,
    status: query.status,
    deliveryId: query.deliveryId,
    isDeleted: query.isDeleted,
    schoolId: query.schoolId
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const createDeliverySchoolHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as DeliverySchoolCreatebodySchemaType;
  const { createdBy } = getAuditFields(c);

  const newRecord = await assignSchoolToDelivery({
    ...body,
    createdBy,
  });

  return c.json({ data: newRecord, message: "Delivery School record created" }, 201);
});

export const getDeliverySchoolByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const data = await getDeliverySchoolById(id);

  return c.json({ data }, 200);
});

export const updateDeliverySchoolHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.parseBody() as unknown as DeliverySchoolUpdateType;

  const updatedRecord = await updateDeliverySchool(id, body);

  return c.json({ data: updatedRecord, message: "Delivery School record updated" }, 200);
});

export const softDeleteDeliverySchoolHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();

  await softDeleteDeliverySchool(id);

  return c.json({ message: "Delivery School record soft deleted" }, 200);
});

export const updateDeliverySchoolStatusHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const { status, deliveredAt } = await c.req.parseBody() as unknown as UpdateDeliverySchoolStatusSchemaType;

  const updatedRecord = await updateDeliverySchoolStatusById(
    id,
    status,
    deliveredAt ? new Date(deliveredAt) : new Date()
  );

  return c.json({ data: updatedRecord, message: `Delivery school status set to ${status}` }, 200);
});