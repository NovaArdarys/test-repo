import { db } from "@/db";
import { kitchens, userDetails, userKitchens, users, } from "@/db/schemas";
import { APIPagination } from "@/types/paginations.type";
import { eq, InferSelectModel, InferInsertModel, SQLWrapper, sql, and, desc } from "drizzle-orm";

export type Kitchen = InferSelectModel<typeof kitchens>;
export type NewKitchen = Omit<
  InferInsertModel<typeof kitchens>,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted'
>;
export type UpdateKitchen = Partial<Omit<NewKitchen, 'createdBy'>> & { updatedBy: string; };


export async function getKitchenById(id: string): Promise<Kitchen | null> {
  const kitchen = await db.query.kitchens.findFirst({
    with: {
      deliveries: true,
      userKitchens: {
        where: (u, { eq, and }) => and(
          eq(u.isDeleted, false)
        ),
        with: {
          user: {
            columns: {
              id: true,
              email: true,
            },
            with: {
              userDetails: true,
              userRoles: {
                with: {
                  role: true
                }
              }
            },
          },
        },
      },
    },
    where: (kitchens, { eq, and }) => and(
      eq(kitchens.id, id),
      eq(kitchens.isDeleted, false)
    ),
  });

  return kitchen ?? null;
}

export async function getKitchensList({
  page,
  limit,
  name,
  isDeleted = false,
  swLat,
  swLng,
  neLat,
  neLng
}: {
  page: number;
  limit: number;
  name?: string;
  isDeleted?: boolean;
  neLat?: string;
  neLng?: string;
  swLat?: string;
  swLng?: string;
}) {
  const offset = (page - 1) * limit;
  const whereConditions: SQLWrapper[] = [];

  if (neLat !== undefined && swLat !== undefined) {
    whereConditions.push(
      sql`${kitchens.lat} BETWEEN ${swLat} AND ${neLat}`
    );
  }
  if (neLng !== undefined && swLng !== undefined) {
    whereConditions.push(
      sql`${kitchens.lon} BETWEEN ${swLng} AND ${neLng}`
    );
  }

  const data = await db.query.kitchens.findMany({
    with: {
      userKitchens: {
        with: {
          user: {
            columns: {
              id: true,
              email: true,
            },
            with: {
              userDetails: true,
              userRoles: {
                with: {
                  role: true
                }
              }
            },
          },
        },
      },
    },
    where: (k, { eq, and, ilike }) => and(
      ...whereConditions,
      eq(k.isDeleted, isDeleted),
      name ? ilike(k.name, `%${name.toLowerCase()}%`) : undefined,
    ),
    orderBy: (k, { desc }) => [desc(k.createdAt)],
    limit,
    offset,
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(kitchens)
    .where(and(eq(kitchens.isDeleted, isDeleted)));

  const total = Number(countResult[0].count);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


export async function createKitchen(data: NewKitchen): Promise<Kitchen> {
  const [newKitchen] = await db.insert(kitchens)
    .values({
      ...data,
      updatedBy: data.createdBy,
      updatedAt: new Date(),
    })
    .returning();

  return newKitchen;
}


export async function updateKitchen(id: string, data: UpdateKitchen): Promise<Kitchen | null> {
  const [updatedKitchen] = await db.update(kitchens)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(kitchens.id, id))
    .returning();

  return updatedKitchen ?? null;
}

export async function softDeleteKitchen(id: string, updatedBy: string): Promise<Kitchen | null> {
  const [deletedKitchen] = await db.update(kitchens)
    .set({
      isDeleted: true,
      updatedBy: updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(kitchens.id, id))
    .returning();

  return deletedKitchen ?? null;
}