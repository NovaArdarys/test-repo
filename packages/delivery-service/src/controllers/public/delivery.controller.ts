import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  CreateDeliverySchemaType,
  ListDeliveriesQuerySchemaType,
  UpdateDeliverySchemaType,
  UpdateDeliveryStatusSchemaType,
  AssignBeneficiarySchemaType
} from "@/validator/delivery.validator";

import {
  createDelivery,
  getDeliveriesList,
  getDeliveryById,
  softDeleteDelivery,
  updateDelivery,
  updateDeliveryStatus
} from "@/services/repositories/delivery.service";
import { assignBeneficiaryToDelivery, getBeneficiarysByDeliveryId, unassignBeneficiaryFromDelivery } from "@/services/repositories/delivery.schools.service";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  domain: c.get('domain'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date(),
  isAppManager: c.get("isAppManager") as boolean,
});



export const listDeliveriesHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as ListDeliveriesQuerySchemaType;

  const page = parseInt(String(query.page || '1'));
  const limit = parseInt(String(query.limit || '10'));
  const audit = getAuditFields(c);
  const startDate = query.startDate || null;
  const endDate = query.endDate || null;

  const data = await getDeliveriesList({
    page,
    limit,
    kitchenIds: audit.kitchenId,
    driverIds: audit.driverId,
    schoolIds: audit.beneficiaryId,
    startDate,
    endDate
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
  const deliveryId = c.req.param("id");

  const { status } = c.get("validatedData").body as unknown as {
    status: "PENDING" | "IN_PROGRESS" | "DELIVERED" | "FAILED";
  };

  const { updatedBy } = getAuditFields(c);

  const updatedDelivery = await updateDeliveryStatus({
    deliveryId,
    status,
    updatedBy
  });

  return c.json(
    { data: updatedDelivery, message: "Delivery status updated" },
    200
  );
});

export const listBeneficiaryByDeliveryIdHandler = catchAsync(async (c: Context) => {
  const { id: deliveryId } = c.req.param();

  await getDeliveryById(deliveryId);

  const data = await getBeneficiarysByDeliveryId(deliveryId);

  return c.json({ data }, 200);
});

export const assignBeneficiaryToDeliveryHandler = catchAsync(async (c: Context) => {
  const { id: deliveryId } = c.req.param();
  const body = await c.get("validatedData").body as unknown as AssignBeneficiarySchemaType;
  const { createdBy } = getAuditFields(c);

  await getDeliveryById(deliveryId);

  const newAssignment = await assignBeneficiaryToDelivery({
    ...body,
    deliveryId,
    createdBy,
  });

  return c.json({ data: newAssignment, message: "Beneficiary assigned to delivery" }, 201);
});

export const unassignBeneficiaryFromDeliveryHandler = catchAsync(async (c: Context) => {
  const { id: deliveryId, beneficiaryId } = c.req.param();

  await unassignBeneficiaryFromDelivery(deliveryId, beneficiaryId);

  return c.json({ message: "Beneficiary unassigned from delivery" }, 200);
});