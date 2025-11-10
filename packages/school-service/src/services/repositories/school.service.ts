import { db } from "@/db"; // Asumsi koneksi Drizzle di sini
import { schools, userSchools } from "@/db/schemas"; // Asumsi skema Anda di sini
import { APIPagination } from "@/types/paginations.type";
import { BulkUpdateItem } from "@/validator/school.validator";
import { eq, and, sql, desc, SQLWrapper, InferInsertModel, InferSelectModel, or, inArray } from "drizzle-orm";

export type School = InferSelectModel<typeof schools>;
export type NewSchool = Omit<
  InferInsertModel<typeof schools>,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted'
>;
export type UpdateSchool = Partial<Omit<NewSchool, 'createdBy'>> & { updatedBy: string; };
export type NewUserSchool = Omit<InferInsertModel<typeof userSchools>, 'createdAt' | 'isDeleted'>;

export async function getSchoolsList({
  page,
  limit,
  name,
  kitchenId,
  isDeleted = false,
  swLat,
  swLng,
  neLat,
  neLng
}: {
  page: number;
  limit: number;
  name?: string;
  kitchenId?: string;
  isDeleted?: boolean;
  neLat?: string;
  neLng?: string;
  swLat?: string;
  swLng?: string;
}): Promise<APIPagination<School>> {
  const offset = (page - 1) * limit;

  const whereConditions: SQLWrapper[] = [];

  if (name) {
    whereConditions.push(
      sql`${schools.name} ILIKE ${"%" + name.toLowerCase() + "%"}`
    );
  }

  if (kitchenId) {
    whereConditions.push(eq(schools.kitchenId, kitchenId));
  }

  if (neLat !== undefined && swLat !== undefined) {
    whereConditions.push(
      sql`${schools.lat} BETWEEN ${swLat} AND ${neLat}`
    );
  }
  if (neLng !== undefined && swLng !== undefined) {
    whereConditions.push(
      sql`${schools.lon} BETWEEN ${swLng} AND ${neLng}`
    );
  }

  const dataPromise = db.query.schools.findMany({
    with: {
      kitchen: {
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
      },
      userSchools: {
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
    where: and(...whereConditions),
    limit,
    offset,
    orderBy: desc(schools.createdAt),
  });

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(schools)
    .where(and(...whereConditions));

  const [data, countResult] = await Promise.all([
    dataPromise,
    countPromise.execute(),
  ]);

  const total = Number(countResult[0].count);

  return {
    data: data as School[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getSchoolById(id: string): Promise<School | null> {
  const school = await db.query.schools.findFirst({
    with: {
      kitchen: {
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
      },
      userSchools: {
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
    where: (schools, { eq, and }) => and(
      eq(schools.id, id),
      eq(schools.isDeleted, false)
    ),
  });
  return school ?? null;
}

export async function createSchool(data: NewSchool): Promise<School> {
  const [newSchool] = await db.insert(schools)
    .values({
      ...data,
      updatedAt: new Date(),
      updatedBy: data.createdBy,
    })
    .returning();
  return newSchool;
}

export async function updateSchool(id: string, data: UpdateSchool): Promise<School | null> {
  const [updatedSchool] = await db.update(schools)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schools.id, id))
    .returning();
  return updatedSchool ?? null;
}

export async function softDeleteSchool(id: string, updatedBy: string): Promise<School | null> {
  const [deletedSchool] = await db.update(schools)
    .set({ isDeleted: true, updatedBy: updatedBy, updatedAt: new Date() })
    .where(eq(schools.id, id))
    .returning();
  return deletedSchool ?? null;
}

export async function assignUserToSchool(data: NewUserSchool): Promise<void> {
  await db.insert(userSchools)
    .values(data);
}

export async function unassignUserFromSchool(userId: string, schoolId: string): Promise<void> {
  await db.update(userSchools)
    .set({ isDeleted: true })
    .where(and(
      eq(userSchools.userId, userId),
      eq(userSchools.schoolId, schoolId)
    ));
}


export async function isUserAssignedToSchool(userId: string, schoolId: string): Promise<boolean> {
  const result = await db.select({ userId: userSchools.userId })
    .from(userSchools)
    .where(and(
      eq(userSchools.userId, userId),
      eq(userSchools.schoolId, schoolId),
      eq(userSchools.isDeleted, false)
    ))
    .limit(1);
  return result.length > 0;
}

// bulk update
export async function syncSchoolsByMerge({
  kitchenId,
  updatedBy,
  schoolIds: newSchoolIds,
}: {
  kitchenId: string;
  updatedBy: string;
  schoolIds: string[];
}): Promise<School[]> {
  if (newSchoolIds.length === 0) return [];

  const results = await db.transaction(async (tx) => {
    const currentSchools = await tx.query.schools.findMany({
      where: (s, { eq, and }) => and(
        eq(s.kitchenId, kitchenId),
      ),
    });
    const currentSchoolIds = currentSchools.map(s => s.id);

    const toAssign = newSchoolIds.filter(id => !currentSchoolIds.includes(id));
    const toUnassign = currentSchoolIds.filter(id => !newSchoolIds.includes(id));

    if (toUnassign.length > 0) {
      await tx.update(schools)
        .set({ kitchenId: null, updatedAt: new Date(), updatedBy })
        .where(and(
          eq(schools.kitchenId, kitchenId),
          or(...toUnassign.map(id => eq(schools.id, id)))
        ));
    }

    const updated: School[] = [];
    for (const schoolId of toAssign) {
      const existingSchool = await tx.query.schools.findFirst({
        where: (s, { eq, and }) => and(
          eq(s.id, schoolId),
        ),
      });

      if (!existingSchool) continue;

      const [row] = await tx.update(schools)
        .set({ ...existingSchool, kitchenId, updatedAt: new Date(), updatedBy })
        .where(eq(schools.id, schoolId))
        .returning();

      if (row) updated.push(row);
    }

    return updated;
  });

  return results;
}

export async function syncUserSchoolByMerge({
  schoolId,
  userId,
  userIds: newUserIds,
}: {
  schoolId: string;
  userId: string;
  userIds: string[];
}): Promise<NewUserSchool[]> {
  const results = await db.transaction(async (tx) => {
    const currentUsers = await tx.query.userSchools.findMany({
      where: (us, { eq, and }) =>
        and(eq(us.schoolId, schoolId), eq(us.isDeleted, false)),
    });

    const currentUserIds = currentUsers.map((u) => u.userId);

    const toAssign = newUserIds.filter((id) => !currentUserIds.includes(id));
    const toUnassign = currentUserIds.filter((id) => !newUserIds.includes(id));

    if (toUnassign.length > 0) {
      await tx
        .update(userSchools)
        .set({ isDeleted: true })
        .where(
          and(
            eq(userSchools.schoolId, schoolId),
            inArray(userSchools.userId, toUnassign)
          )
        );
    }

    let inserted: NewUserSchool[] = [];
    if (toAssign.length > 0) {
      const rowsToInsert = toAssign.map((uid) => ({
        schoolId,
        userId: uid,
        createdBy: userId,
        createdAt: new Date(),
        isDeleted: false,
      }));

      const rows = await tx
        .insert(userSchools)
        .values(rowsToInsert)
        .returning();

      inserted = rows;
    }

    return inserted;
  });

  return results;
}
