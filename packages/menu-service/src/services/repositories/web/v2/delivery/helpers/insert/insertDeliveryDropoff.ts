import { deliveries } from "@/db/schemas";
import { ProcessSingleDriverArgs } from "../../types/autoDelivery";
import { DeliveryUnit } from "../../types/domain";
import { generateDeliveryCode } from "../../lib/generateDeliveryCode";
import { sql } from "drizzle-orm";

export default async function insertDeliveryDropoff(
  trx: any,
  args: ProcessSingleDriverArgs,
  unit: DeliveryUnit
) {

  const now = new Date();

  const deliveryCode =
    generateDeliveryCode(args.data.kitchenId, unit.beneficiaryId, unit.type)
    + `-DROPOFF`
    + `-TRIP-${unit.trip ?? 0}`
    + `-ORDER-${String(unit.orderIndex).padStart(2, '0')}`
    + `-GLOBALORDER-${String(unit.globalOrderIndex).padStart(2, '0')}`;

  const [delivery] = await trx
    .insert(deliveries)
    .values({
      id: sql`DEFAULT`,
      kitchenId: args.data.kitchenId,
      driverId: args.driver.id,
      driverCapacity: args.driver.portionCapacity,

      deliveryDate: args.menuPlan.planStartDate,
      startTime: sql`NULL`,
      endTime: sql`NULL`,
      estimatedDeliveryTime: sql`NULL`,

      notes: `DROPOFF | ${args.menuPlan.name} | portion: ${unit.portion}-${unit.type}`,
      deliveryCode: deliveryCode,

      status: "PENDING",
      isDeleted: false,

      createdAt: now,
      createdBy: args.kitchen.createdBy,
      updatedAt: now,
      updatedBy: args.kitchen.createdBy,

      portionType: unit.type,
      targetPortion: unit.portion,
      receivedPortion: 0,
      deliveredPortion: 0,
      takenTray: 0,

      type: "DROPOFF",
      deliveryOrder: unit.orderIndex,

      storageId: sql`NULL`,
      imageUrl: sql`NULL`,
    })
    .returning();

  return delivery;
}
