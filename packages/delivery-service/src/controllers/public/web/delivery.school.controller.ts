import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  DeliveryBeneficiaryListQueryType,
} from "@/validators";
import { getDeliveryBeneficiaryList } from "@/services/repositories/web/delivery.schools.service";

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