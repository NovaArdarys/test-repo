import { deliveries } from "@/db/schemas";
import { ProcessSingleDriverArgs } from "../../types/autoDelivery";
import { ETAUnit } from "../../types/autoDelivery";
import { generateDeliveryCode } from "../../lib/generateDeliveryCode";
import { sql } from "drizzle-orm";

export default async function insertDeliveryDropoff(
  trx: any,
  args: ProcessSingleDriverArgs,
  unit: ETAUnit
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
      startTime: unit.startTime,       // kapan driver BERANGKAT menuju stop ini
      endTime: sql`NULL`,
      estimatedDeliveryTime: unit.eta, // kapan driver TIBA (estimasi pengantaran makanan)

      notes: `Pengantaran Makanan: ${args.menuPlan.name} (${unit.portion} Porsi ${unit.type === 'SMALL' ? 'Kecil' : 'Besar'})`,
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
