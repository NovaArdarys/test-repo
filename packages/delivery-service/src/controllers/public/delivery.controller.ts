import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  CreateDeliverySchemaType,
  ListDeliveriesQuerySchemaType,
  UpdateDeliverySchemaType,
  UpdateDeliveryStatusSchemaType,
  AssignSchoolSchemaType
} from "@/validator/delivery.validator";

import {
  createDelivery,
  getDeliveriesList,
  getDeliveryById,
  softDeleteDelivery,
  updateDelivery,
  updateDeliveryStatus
} from "@/services/repositories/delivery.service";
import { assignSchoolToDelivery, getSchoolsByDeliveryId, unassignSchoolFromDelivery } from "@/services/repositories/delivery.schools.service";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId') as string,
  updatedBy: c.get('userId') as string,
});

export const listDeliveriesHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as ListDeliveriesQuerySchemaType;

  const page = parseInt(String(query.page || '1'));
  const limit = parseInt(String(query.limit || '10'));

  const data = await getDeliveriesList({
    page,
    limit,
    status: query.status,
    kitchenId: query.kitchenId,
    driverId: query.driverId,
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const createDeliveryHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as CreateDeliverySchemaType;
  const { createdBy } = getAuditFields(c);

  const newDelivery = await createDelivery({
    ...body,
    startTime: new Date(body.startTime),
    endTime: new Date(body.endTime),
    estimatedDeliveryTime: new Date(body.estimatedDeliveryTime),
    createdBy,
  });

  return c.json({ data: newDelivery, message: "Delivery trip created" }, 201);
});

export const getDeliveryByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const data = await getDeliveryById(id);

  return c.json({ data }, 200);
});

export const updateDeliveryHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.parseBody() as unknown as UpdateDeliverySchemaType;
  const { updatedBy } = getAuditFields(c);

  const updatedDelivery = await updateDelivery(id, {
    ...body,
    startTime: new Date(body.startTime!),
    endTime: new Date(body.endTime!),
    estimatedDeliveryTime: new Date(body.estimatedDeliveryTime!),
    updatedBy,
  });

  return c.json({ data: updatedDelivery, message: "Delivery updated" }, 200);
});

export const softDeleteDeliveryHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const { updatedBy } = getAuditFields(c);

  await softDeleteDelivery(id, updatedBy);

  return c.json({ message: "Delivery soft deleted" }, 200);
});

export const updateDeliveryStatusHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const { status } = await c.req.parseBody() as unknown as UpdateDeliveryStatusSchemaType;
  const { updatedBy } = getAuditFields(c);

  const updatedDelivery = await updateDeliveryStatus(id, status, updatedBy);

  return c.json({ data: updatedDelivery, message: `Delivery status set to ${status}` }, 200);
});

export const listSchoolsByDeliveryIdHandler = catchAsync(async (c: Context) => {
  const { id: deliveryId } = c.req.param();

  await getDeliveryById(deliveryId);

  const data = await getSchoolsByDeliveryId(deliveryId);

  return c.json({ data }, 200);
});

export const assignSchoolToDeliveryHandler = catchAsync(async (c: Context) => {
  const { id: deliveryId } = c.req.param();
  const body = await c.req.parseBody() as unknown as AssignSchoolSchemaType;
  const { createdBy } = getAuditFields(c);

  await getDeliveryById(deliveryId);

  const newAssignment = await assignSchoolToDelivery({
    ...body,
    deliveryId,
    createdBy,
  });

  return c.json({ data: newAssignment, message: "School assigned to delivery" }, 201);
});

export const unassignSchoolFromDeliveryHandler = catchAsync(async (c: Context) => {
  const { id: deliveryId, schoolId } = c.req.param();

  await unassignSchoolFromDelivery(deliveryId, schoolId);

  return c.json({ message: "School unassigned from delivery" }, 200);
});