import { driverLocations } from "@/db/schemas";
import { inArray } from "drizzle-orm";

export async function purgeDriverLocations(
  trx: any,
  deliveryIds: string[]
) {
  if (!deliveryIds.length) return;

  return await trx
    .delete(driverLocations)
    .where(inArray(driverLocations.deliveryId, deliveryIds));
}
