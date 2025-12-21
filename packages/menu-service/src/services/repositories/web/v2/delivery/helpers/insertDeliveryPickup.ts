import { deliveries } from "@/db/schemas";
import { ProcessSingleDriverArgs } from "../types/autoDelivery";
import { DeliveryUnit } from "../types/domain";
import { generateDeliveryCode } from "../lib/generateDeliveryCode";

export default async function insertPickupDelivery(
  trx: any,
  args: ProcessSingleDriverArgs,
  unit: DeliveryUnit
) {

  const [pickup] = await trx
    .insert(deliveries)
    .values({
      kitchenId: args.data.kitchenId,
      driverId: args.driver.id,
      type: "PICKUP",
      startTime: new Date(),
      deliveryCode: generateDeliveryCode(
        args.data.kitchenId,
        unit.beneficiaryId,
        unit.type
      ) + "-P",
      portionType: unit.type,
      targetPortion: unit.portion,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: args.data.createdBy,
      updatedBy: args.data.createdBy,
      orderIndex: unit.orderIndex * 2
    })
    .returning();

  return pickup;
}
