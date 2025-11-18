import { db } from "@/db"; // Asumsi koneksi Drizzle di sini
import { beneficiaries, userBeneficiaries } from "@/db/schemas"; // Asumsi skema Anda di sini
import { APIPagination } from "@/types/paginations.type";
import { eq, and, sql, desc, SQLWrapper, InferInsertModel, InferSelectModel, or, inArray } from "drizzle-orm";
import { compact } from "lodash";

export type Beneficiary = InferSelectModel<typeof beneficiaries>;
export type NewBeneficiary = Omit<
  InferInsertModel<typeof beneficiaries>,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted'
>;
export type UpdateBeneficiary = Partial<Omit<NewBeneficiary, 'createdBy'>> & { updatedBy: string; };
export type NewUserBeneficiary = Omit<InferInsertModel<typeof userBeneficiaries>, 'createdAt' | 'isDeleted'>;

export async function getBeneficiaryList({
  page,
  limit,
  name,
  kitchenIds,
  isDeleted = false,
  swLat,
  swLng,
  neLat,
  neLng,
  status,
  author,
  isAppManager
}: {
  page: number;
  limit: number;
  name?: string;
  kitchenIds?: string[];
  isDeleted?: boolean;
  neLat?: string;
  neLng?: string;
  swLat?: string;
  swLng?: string;
  status?: string;
  isAppManager?: boolean;
  author?: string;
}): Promise<APIPagination<Beneficiary>> {
  const offset = (page - 1) * limit;

  const whereConditions: SQLWrapper[] = [];

  if (!isAppManager && kitchenIds) {
    whereConditions.push(inArray(beneficiaries.kitchenId, compact(kitchenIds)));
  }

  if (name) {
    whereConditions.push(
      sql`${beneficiaries.name} ILIKE ${"%" + name.toLowerCase() + "%"}`
    );
  }

  if (status) {
    whereConditions.push(eq(beneficiaries.status, status));
  }

  if (neLat !== undefined && swLat !== undefined) {
    whereConditions.push(
      sql`${beneficiaries.lat} BETWEEN ${swLat} AND ${neLat}`
    );
  }
  if (neLng !== undefined && swLng !== undefined) {
    whereConditions.push(
      sql`${beneficiaries.lon} BETWEEN ${swLng} AND ${neLng}`
    );
  }

  const dataPromise = db.query.beneficiaries.findMany({
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
      userBeneficiaries: {
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
    orderBy: desc(beneficiaries.createdAt),
  });

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(beneficiaries)
    .where(and(...whereConditions));

  const [data, countResult] = await Promise.all([
    dataPromise,
    countPromise.execute(),
  ]);

  const total = Number(countResult[0].count);

  return {
    data: data as Beneficiary[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getBeneficiaryById(id: string): Promise<Beneficiary | null> {
  const beneficiary = await db.query.beneficiaries.findFirst({
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
      userBeneficiaries: {
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
    where: (beneficiary, { eq, and }) => and(
      eq(beneficiary.id, id),
      eq(beneficiary.isDeleted, false)
    ),
  });
  return beneficiary ?? null;
}

export async function createBeneficiary(data: NewBeneficiary): Promise<Beneficiary> {
  const [newBeneficiary] = await db.insert(beneficiaries)
    .values({
      ...data,
      provinceId: data.provinceId || "11111111-1111-1111-1111-111111111111",
      districtId: data.districtId || "11111111-1111-1111-1111-111111111111",
      regencyId: data.regencyId || "11111111-1111-1111-1111-111111111111",
      villageId: data.villageId || "11111111-1111-1111-1111-111111111111",
      updatedAt: new Date(),
      updatedBy: data.createdBy,
    })
    .returning();
  return newBeneficiary;
}

export async function updateBeneficiary(id: string, data: UpdateBeneficiary): Promise<Beneficiary | null> {
  const [updatedBeneficiary] = await db.update(beneficiaries)
    .set({
      ...data,
      provinceId: data.provinceId || "11111111-1111-1111-1111-111111111111",
      districtId: data.districtId || "11111111-1111-1111-1111-111111111111",
      regencyId: data.regencyId || "11111111-1111-1111-1111-111111111111",
      villageId: data.villageId || "11111111-1111-1111-1111-111111111111",
      updatedAt: new Date()
    })
    .where(eq(beneficiaries.id, id))
    .returning();
  return updatedBeneficiary ?? null;
}

export async function softDeleteBeneficiary(id: string, updatedBy: string): Promise<Beneficiary | null> {
  const [deletedBeneficiary] = await db.update(beneficiaries)
    .set({ isDeleted: true, updatedBy: updatedBy, updatedAt: new Date() })
    .where(eq(beneficiaries.id, id))
    .returning();
  return deletedBeneficiary ?? null;
}

export async function assignUserToBeneficiary(data: NewUserBeneficiary): Promise<void> {
  await db.insert(userBeneficiaries)
    .values(data);
}

export async function unassignUserFromBeneficiary(userId: string, beneficiaryId: string): Promise<void> {
  await db.update(userBeneficiaries)
    .set({ isDeleted: true })
    .where(and(
      eq(userBeneficiaries.userId, userId),
      eq(userBeneficiaries.beneficiaryId, beneficiaryId)
    ));
}


export async function isUserAssignedToBeneficiary(userId: string, beneficiaryId: string): Promise<boolean> {
  const result = await db.select({ userId: userBeneficiaries.userId })
    .from(userBeneficiaries)
    .where(and(
      eq(userBeneficiaries.userId, userId),
      eq(userBeneficiaries.beneficiaryId, beneficiaryId),
      eq(userBeneficiaries.isDeleted, false)
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
}): Promise<Beneficiary[]> {
  if (newSchoolIds.length === 0) return [];

  const results = await db.transaction(async (tx) => {
    const currentSchools = await tx.query.beneficiaries.findMany({
      where: (s, { eq, and }) => and(
        eq(s.kitchenId, kitchenId),
      ),
    });
    const currentSchoolIds = currentSchools.map(s => s.id);

    const toAssign = newSchoolIds.filter(id => !currentSchoolIds.includes(id));
    const toUnassign = currentSchoolIds.filter(id => !newSchoolIds.includes(id));

    if (toUnassign.length > 0) {
      await tx.update(beneficiaries)
        .set({ kitchenId: null, updatedAt: new Date(), updatedBy })
        .where(and(
          eq(beneficiaries.kitchenId, kitchenId),
          or(...toUnassign.map(id => eq(beneficiaries.id, id)))
        ));
    }

    const updated: Beneficiary[] = [];
    for (const beneficiaryId of toAssign) {
      const existingSchool = await tx.query.beneficiaries.findFirst({
        where: (s, { eq, and }) => and(
          eq(s.id, beneficiaryId),
        ),
      });

      if (!existingSchool) continue;

      const [row] = await tx.update(beneficiaries)
        .set({ ...existingSchool, kitchenId, updatedAt: new Date(), updatedBy })
        .where(eq(beneficiaries.id, beneficiaryId))
        .returning();

      if (row) updated.push(row);
    }

    return updated;
  });

  return results;
}

export async function syncUserBeneficiaryByMerge({
  beneficiaryId,
  userId,
  userIds: newUserIds,
}: {
  beneficiaryId: string;
  userId: string;
  userIds: string[];
}): Promise<NewUserBeneficiary[]> {
  const results = await db.transaction(async (tx) => {
    const currentUsers = await tx.query.userBeneficiaries.findMany({
      where: (us, { eq, and }) =>
        and(eq(us.beneficiaryId, beneficiaryId), eq(us.isDeleted, false)),
    });

    const currentUserIds = currentUsers.map((u) => u.userId);

    const toAssign = newUserIds.filter((id) => !currentUserIds.includes(id));
    const toUnassign = currentUserIds.filter((id) => !newUserIds.includes(id));

    if (toUnassign.length > 0) {
      await tx
        .update(userBeneficiaries)
        .set({ isDeleted: true })
        .where(
          and(
            eq(userBeneficiaries.beneficiaryId, beneficiaryId),
            inArray(userBeneficiaries.userId, toUnassign)
          )
        );
    }

    let inserted: NewUserBeneficiary[] = [];
    if (toAssign.length > 0) {
      const rowsToInsert = toAssign.map((uid) => ({
        beneficiaryId: beneficiaryId,
        userId: uid,
        createdBy: userId,
        createdAt: new Date(),
        isDeleted: false,
      }));

      const rows = await tx
        .insert(userBeneficiaries)
        .values(rowsToInsert)
        .returning();

      inserted = rows;
    }

    return inserted;
  });

  return results;
}
