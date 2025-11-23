import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  ListDeliveriesQuerySchemaType
} from "@/validator/delivery.validator";

import { updateDeliveryStatus, getDeliveriesListDriver } from "@/services/repositories/mobile/delivery.driver.service";
import { getDeliveriesListKitchen } from "@/services/repositories/mobile/delivery.kitchen.service";
import { getDeliveriesListBeneficiary } from "@/services/repositories/mobile/delivery.beneficery.service";

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
  const query = await c.get("validatedData").query as ListDeliveriesQuerySchemaType;
  const param = await c.get("validatedData").param;

  const page = parseInt(String(query.page || '1'));
  const limit = parseInt(String(query.limit || '10'));
  const audit = getAuditFields(c);
  const startDate = query.startDate || null;
  const endDate = query.endDate || null;

  console.log(param?.entity, "===== param?.entity ======");


  if (param?.entity === "driver") {
    const data = await getDeliveriesListDriver({
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

  }

  if (param?.entity === "beneficiary") {
    const data = await getDeliveriesListBeneficiary({
      page,
      limit,
      kitchenIds: audit.kitchenId,
      driverIds: audit.driverId,
      schoolIds: audit.beneficiaryId,
      startDate,
      endDate,
    });

    return c.json({ data: data.data, meta: data.meta }, 200);

  }

  const data = await getDeliveriesListKitchen({
    page,
    limit,
    kitchenIds: audit.kitchenId,
    driverIds: audit.driverId,
    schoolIds: audit.beneficiaryId,
    startDate,
    endDate,
  });


  return c.json({ data: data.data, meta: data.meta }, 200);
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
