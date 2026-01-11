import { db } from "@/db";
import { drivers } from "@/db/schemas";
import { and, eq, gt, inArray } from "drizzle-orm";

export interface ActiveDriver {
  id: string;
  userId: string;
  kitchenId: string;
  portionCapacity: number | null;
}

export async function getActiveDriversByKitchen(
  kitchenIds: string[]
): Promise<ActiveDriver[]> {
  const rows = await db
    .select({
      id: drivers.id,
      userId: drivers.userId,
      kitchenId: drivers.kitchenId,
      portionCapacity: drivers.portionCapacity,
    })
    .from(drivers)
    .where(
      and(
        inArray(drivers.kitchenId, kitchenIds),
        eq(drivers.isDeleted, false),
        eq(drivers.isActive, true),
        gt(drivers.portionCapacity, 0)
      )
    );

  if (rows.length < 2) {
    return [];
  }

  return rows;
}
