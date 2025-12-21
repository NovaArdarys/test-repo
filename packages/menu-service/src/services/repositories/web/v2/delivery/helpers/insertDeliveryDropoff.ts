import { deliveries } from "@/db/schemas";
import { ProcessSingleDriverArgs } from "../types/autoDelivery";
import { DeliveryUnit } from "../types/domain";
import { generateDeliveryCode } from "../lib/generateDeliveryCode";

export default async function insertDeliveryDropoff(
  trx: any,
  args: ProcessSingleDriverArgs,
  unit: DeliveryUnit
) {

  const [delivery] = await trx
    .insert(deliveries)
    .values({
      kitchenId: args.data.kitchenId,
      driverId: args.driver.id,
      deliveryDate: args.menuPlan.planStartDate,
      startTime: null,
      endTime: null,
      estimatedDeliveryTime: null,
      notes: `DROPOFF, ${args.menuPlan.name}, portion: ${unit.portion} - ${unit.type} `,
      deliveryCode: generateDeliveryCode(
        args.data.kitchenId,
        unit.beneficiaryId,
        unit.type
      ) + "-D",
      status: "PENDING",
      portionType: unit.type,
      targetPortion: unit.portion,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: args.data.createdBy,
      updatedBy: args.data.createdBy,
      deliveryOrder: unit.orderIndex,
      type: "DROPOFF",
    })
    .returning();

  return delivery;
}
