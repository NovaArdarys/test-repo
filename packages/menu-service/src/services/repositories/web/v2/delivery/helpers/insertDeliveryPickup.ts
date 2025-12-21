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
      deliveryDate: args.menuPlan.planStartDate,
      startTime: new Date(),
      endTime: null,
      estimatedDeliveryTime: null,
      notes: `PICKUP, ${args.menuPlan.name}, portion: ${unit.portion} - ${unit.type} `, // ✔️ samakan format
      deliveryCode: generateDeliveryCode(
        args.data.kitchenId,
        unit.beneficiaryId,
        unit.type
      ) + "-P",
      status: "PENDING",
      portionType: unit.type,
      targetPortion: unit.portion,
      receivedPortion: 0,
      deliveredPortion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: args.data.createdBy,
      updatedBy: args.data.createdBy,
      deliveryOrder: unit.orderIndex,
      type: "PICKUP",
    })
    .returning();

  return pickup;
}
