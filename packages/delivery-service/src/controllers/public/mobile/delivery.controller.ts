import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  ListDeliveriesQuerySchemaType
} from "@/validator/delivery.validator";

import {
  getDeliveriesList
} from "@/services/repositories/delivery.service";

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


export const listDeliveriesHandler = catchAsync(async (c: Context) => {
  const query = await c.get("validatedData").query as ListDeliveriesQuerySchemaType;
  const param = await c.get("validatedData").param;

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
    endDate,
    entity: param?.entity
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});