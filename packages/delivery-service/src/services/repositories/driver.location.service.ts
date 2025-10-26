import { db } from "@/db";
import { driverLocations } from "@/db/schemas";
import { eq, and, desc, sql, InferInsertModel, InferSelectModel } from "drizzle-orm";

export type DriverLocation = InferSelectModel<typeof driverLocations>;

export type NewDriverLocation = Omit<
  InferInsertModel<typeof driverLocations>,
  'id' | 'isDeleted' | 'recordedAt' | 'createdBy'
> & { createdBy?: string; };

export async function recordDriverLocation(data: NewDriverLocation): Promise<DriverLocation> {
  const [newLocation] = await db.insert(driverLocations)
    .values({
      ...data,
      createdBy: data.createdBy,
    })
    .returning();
  return newLocation;
}

export async function getLatestDriverLocation(driverId: string, deliveryId: string): Promise<DriverLocation | null> {
  const latestLocation = await db.query.driverLocations.findFirst({
    where: (dl, { eq, and }) => and(
      eq(dl.driverId, driverId),
      eq(dl.deliveryId, deliveryId),
      eq(dl.isDeleted, false)
    ),
    orderBy: (dl, { desc }) => desc(dl.recordedAt),
  });
  return latestLocation ?? null;
}

export async function getDriverLocationHistoryByDeliveryId(deliveryId: string): Promise<DriverLocation[]> {
  const history = await db.query.driverLocations.findMany({
    where: (dl, { eq }) => and(
      eq(dl.deliveryId, deliveryId),
      eq(dl.isDeleted, false)
    ),
    orderBy: (dl, { asc }) => asc(dl.recordedAt),
  });
  return history;
}

export async function softDeleteLocationsByDeliveryId(deliveryId: string, updatedBy: string): Promise<void> {
  await db.update(driverLocations)
    .set({
      isDeleted: true,
    })
    .where(eq(driverLocations.deliveryId, deliveryId));
}