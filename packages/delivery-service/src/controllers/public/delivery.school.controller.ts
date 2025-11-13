import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  DeliveryBeneficiaryCreatebodySchemaType,
  DeliveryBeneficiaryListQueryType,
  DeliveryBeneficiaryUpdateType,
  UpdateDeliveryBeneficiaryStatusSchemaType,
} from "@/validator/delivery.school.validation";
import { assignBeneficiaryToDelivery, getDeliveryBeneficiaryById, getDeliveryBeneficiaryList, softDeleteDeliveryBeneficiary, updateDeliveryBeneficiary, updateDeliveryBeneficiaryStatusById } from "@/services/repositories/delivery.schools.service";

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


export const listDeliveryBeneficiaryHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as DeliveryBeneficiaryListQueryType;

  const page = parseInt(String(query.page || '1'));
  const limit = parseInt(String(query.limit || '10'));

  const data = await getDeliveryBeneficiaryList({
    page,
    limit,
    status: query.status,
    deliveryId: query.deliveryId,
    isDeleted: query.isDeleted,
    beneficiaryId: query.beneficiaryId
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const createDeliveryBeneficiaryHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as DeliveryBeneficiaryCreatebodySchemaType;
  const { createdBy } = getAuditFields(c);

  const newRecord = await assignBeneficiaryToDelivery({
    ...body,
    createdBy,
  });

  return c.json({ data: newRecord, message: "Delivery Beneficiary record created" }, 201);
});

export const getDeliveryBeneficiaryByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const data = await getDeliveryBeneficiaryById(id);

  return c.json({ data }, 200);
});

export const updateDeliveryBeneficiaryHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.parseBody() as unknown as DeliveryBeneficiaryUpdateType;

  const updatedRecord = await updateDeliveryBeneficiary(id);

  return c.json({ data: updatedRecord, message: "Delivery Beneficiary record updated" }, 200);
});

export const softDeleteDeliveryBeneficiaryHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();

  await softDeleteDeliveryBeneficiary(id);

  return c.json({ message: "Delivery Beneficiary record soft deleted" }, 200);
});

export const updateDeliveryBeneficiaryStatusHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const { status, deliveredAt } = await c.req.parseBody() as unknown as UpdateDeliveryBeneficiaryStatusSchemaType;

  const updatedRecord = await updateDeliveryBeneficiaryStatusById(
    id,
  );

  return c.json({ data: updatedRecord, message: `Delivery Beneficiary status set to ${status}` }, 200);
});