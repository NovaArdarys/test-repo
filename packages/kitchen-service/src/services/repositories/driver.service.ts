import { db } from "@/db";
import { drivers, } from "@/db/schemas";
import { APIPagination } from "@/types/paginations.type";
import { eq, InferSelectModel, InferInsertModel, and, sql, desc, SQLWrapper } from "drizzle-orm";

export type Driver = InferSelectModel<typeof drivers>;
export type NewDriver = Omit<
  InferInsertModel<typeof drivers>,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted'
>;
export type UpdateDriver = Partial<Omit<NewDriver, 'createdBy'>> & { updatedBy: string; };

export async function getDriverById(driverId: string): Promise<Driver | null> {
  const driver = await db.query.drivers.findFirst({
    with: {
      kitchen: true,
    },
    where: (drivers, { eq, and }) => and(
      eq(drivers.id, driverId),
      eq(drivers.isDeleted, false)
    ),
  });

  return driver ?? null;
}

export async function getDriverByUserId(userId: string): Promise<Driver | null> {
  const driver = await db.query.drivers.findFirst({
    with: {
      kitchen: true,
    },
    where: (drivers, { eq, and }) => and(
      eq(drivers.userId, userId),
      eq(drivers.isDeleted, false)
    ),
  });

  return driver ?? null;
}

export async function getDriversList({
  page,
  limit,
  isActive,
  kitchenId,
}: {
  page: number;
  limit: number;
  isActive?: boolean;
  kitchenId?: string;
}): Promise<APIPagination<Driver>> {

  const offset = (page - 1) * limit;

  const whereConditions: SQLWrapper[] = [
    eq(drivers.isDeleted, false),
  ];

  if (isActive !== undefined) {
    whereConditions.push(eq(drivers.isActive, isActive));
  }

  if (kitchenId) {
    whereConditions.push(eq(drivers.kitchenId, kitchenId));
  }

  const dataPromise = db.query.drivers
    .findMany({
      with: {
        kitchen: true,
      },
      where: and(...whereConditions),
      limit: limit,
      offset: offset,
      orderBy: desc(drivers.createdAt),
    });

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(drivers)
    .where(and(...whereConditions));

  const [data, countResult] = await Promise.all([dataPromise, countPromise.execute()]);

  const total = Number(countResult[0].count);

  return {
    data: data as Driver[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  };
}

export async function isUserAlreadyHaveDriverRole(userId: string, kitchenId: string): Promise<boolean> {
  const result = await db.select({ userId: drivers.userId })
    .from(drivers)
    .where(and(
      eq(drivers.userId, userId),
      eq(drivers.kitchenId, kitchenId),
      eq(drivers.isDeleted, false)
    ))
    .limit(1);
  return result.length > 0;
}

export async function isDriverAssignedToKitchen(
  userId: string,
  kitchenId: string,
): Promise<{
  isAssigned: boolean;
  assignment: { userId: string; id: string; } | null;
}> {
  const result = await db
    .select({ userId: drivers.userId, id: drivers.id })
    .from(drivers)
    .where(
      and(
        eq(drivers.userId, userId),
        eq(drivers.kitchenId, kitchenId),
      ),
    )
    .limit(1);

  return {
    isAssigned: result.length > 0,
    assignment: result[0] ?? null,
  };
}


export async function createDriver(data: NewDriver): Promise<Driver> {
  console.log(data, "=====data=====");

  const [newDriver] = await db.insert(drivers)
    .values({
      ...data,
      portionCapacity: Number(data?.portionCapacity ?? 0),
      updatedAt: new Date(),
      updatedBy: data.createdBy,
    })
    .returning();

  return newDriver;
}

export async function updateDriver(driverId: string, data: UpdateDriver): Promise<Driver | null> {
  const [updatedDriver] = await db.update(drivers)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(drivers.id, driverId))
    .returning();

  return updatedDriver ?? null;
}

export async function softDeleteDriver(id: string, updatedBy: string): Promise<Driver | null> {
  const [deletedKitchen] = await db.update(drivers)
    .set({
      isDeleted: true,
      updatedBy: updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(drivers.id, id))
    .returning();

  return deletedKitchen ?? null;
}