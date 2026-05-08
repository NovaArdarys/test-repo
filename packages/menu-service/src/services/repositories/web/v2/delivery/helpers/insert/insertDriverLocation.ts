import { driverLocations } from "@/db/schemas";

export default async function insertDriverLocation(
  trx: any,
  args: any,
  delivery: any
): Promise<void> {

  if (!args.driver.id) return;

  await trx.insert(driverLocations).values({
    driverId: args.driver.id,
    deliveryId: delivery.id,
    lat: null,
    lon: null,
    createdBy: args.driver.userId,
  });
}
