import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  ListDeliveriesQuerySchemaType
} from "@/validators";

import {
  getDeliveriesList,
  getDeliveryById
} from "@/services/repositories/delivery.service";

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

export const getDeliveryByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const data = await getDeliveryById(id);

  return c.json({ data }, 200);
});