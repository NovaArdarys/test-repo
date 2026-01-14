import { drivers, users } from "@/db/schemas";
import { and, eq, gt, inArray } from "drizzle-orm";
import { Trx, DriverRow } from "../../types/domain";

export default async function fetchDrivers(
  trx: Trx,
  kitchenId: string
): Promise<DriverRow[]> {

  const rows = await trx
    .select({
      id: drivers.id,
      userId: drivers.userId,
      kitchenId: drivers.kitchenId,
      licenseNumber: drivers.licenseNumber,
      isActive: drivers.isActive,
      isDeleted: drivers.isDeleted,
      createdAt: drivers.createdAt,
      createdBy: drivers.createdBy,
      updatedAt: drivers.updatedAt,
      updatedBy: drivers.updatedBy,
      portionCapacity: drivers.portionCapacity,
    })
    .from(drivers)
    .leftJoin(
      users,
      and(
        eq(users.id, drivers.userId),
        eq(users.isActive, true)
      )
    )
    .where(
      and(
        eq(drivers.kitchenId, kitchenId),
        eq(drivers.isDeleted, false),
        eq(drivers.isActive, true),
        gt(drivers.portionCapacity, 0)
      )
    );

  return rows satisfies DriverRow[];
}
