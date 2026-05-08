import { deliveries } from "@/db/schemas";
import { ProcessSingleDriverArgs } from "../../types/autoDelivery";
import { ETAUnit } from "../../types/autoDelivery";
import { generateDeliveryCode } from "../../lib/generateDeliveryCode";
import { sql } from "drizzle-orm";
import type { PickupETA } from "../../lib/calcPickupETAs";

export default async function insertPickupDelivery(
  trx: any,
  args: ProcessSingleDriverArgs,
  unit: ETAUnit,
  pickupETA: PickupETA  // pre-computed chained ETA dari calcPickupETAs
) {

  const now = new Date();

  const deliveryCode =
    generateDeliveryCode(args.data.kitchenId, unit.beneficiaryId, unit.type)
    + `-PICKUP`
    + `-TRIP-${unit.trip ?? 0}`
    + `-ORDER-${String(unit.orderIndex).padStart(2, '0')}`
    + `-GLOBALORDER-${String(unit.globalOrderIndex).padStart(2, '0')}`;

  const [pickup] = await trx
    .insert(deliveries)
    .values({
      id: sql`DEFAULT`,
      kitchenId: args.data.kitchenId,
      driverId: args.driver.id,
      driverCapacity: args.driver.portionCapacity,
      deliveryDate: args.menuPlan.planStartDate,
      startTime: pickupETA.startTime,       // kapan driver BERANGKAT untuk ambil tray (chained)
      endTime: sql`NULL`,
      estimatedDeliveryTime: pickupETA.eta, // kapan driver TIBA untuk ambil tray (chained)

      notes: `Pengambilan Tray: ${args.menuPlan.name} (${unit.portion} Porsi ${unit.type === 'SMALL' ? 'Kecil' : 'Besar'})`,
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

      type: "PICKUP",
      deliveryOrder: unit.orderIndex,

      storageId: sql`NULL`,
      imageUrl: sql`NULL`,
    })
    .returning();

  return pickup;
}
