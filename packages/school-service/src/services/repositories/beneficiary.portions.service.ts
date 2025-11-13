import { db } from "@/db";
import { beneficiaryPortions, menuPlans, storage } from "@/db/schemas";
import { APIPagination } from "@/types/paginations.type";
import { eq, and, sql, desc, SQLWrapper, or } from "drizzle-orm";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type BeneficiaryPortions = InferSelectModel<typeof beneficiaryPortions>;
export type NewBeneficiaryPortions = Omit<
  InferInsertModel<typeof beneficiaryPortions>,
  "id" | "createdAt" | "isDeleted"
>;
export type UpdateBeneficiaryPortions = Partial<Omit<NewBeneficiaryPortions, "createdBy">> & {
  updatedBy: string;
};

export async function getBeneficiaryPortionsList({
  page = 1,
  limit = 10,
  name,
  schoolIds = [],
  portionType,
  isDeleted = false,
  startDate,
  endDate,
}: {
  page?: number;
  limit?: number;
  name?: string;
  schoolIds?: string[];
  portionType?: string;
  isDeleted?: boolean;
  startDate?: string;
  endDate?: string;
}): Promise<APIPagination<any>> {
  const offset = (page - 1) * limit;
  const whereConditions: SQLWrapper[] = [];

  if (name) {
    whereConditions.push(
      sql`${beneficiaryPortions.name} ILIKE ${"%" + name.toLowerCase() + "%"}`
    );
  }

  if (schoolIds && schoolIds.length > 0) {
    const uuidArray = sql.raw(
      `ARRAY[${schoolIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
    );
    whereConditions.push(sql`${beneficiaryPortions.beneficiaryId} = ANY(${uuidArray})`);
  }

  if (startDate && endDate) {
    whereConditions.push(
      sql`${beneficiaryPortions.date} BETWEEN ${startDate} AND ${endDate}`
    );
  } else if (startDate) {
    whereConditions.push(sql`${beneficiaryPortions.date} >= ${startDate}`);
  } else if (endDate) {
    whereConditions.push(sql`${beneficiaryPortions.date} <= ${endDate}`);
  }

  if (portionType !== undefined) {
    whereConditions.push(eq(beneficiaryPortions.portionType, portionType));
  }

  whereConditions.push(eq(beneficiaryPortions.isDeleted, isDeleted));

  const rawData = await db
    .select({
      classroom: beneficiaryPortions,
      menuPlan: {
        id: menuPlans.id,
        name: menuPlans.name,
        date: menuPlans.planStartDate,
      },
      storage: {
        id: storage.id,
        imageURL: storage.fileUrl,
      },
    })
    .from(beneficiaryPortions)
    .leftJoin(menuPlans, eq(beneficiaryPortions.menuPlanId, menuPlans.id))
    .leftJoin(storage, eq(beneficiaryPortions.id, storage.entityId))
    .where(and(...whereConditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(beneficiaryPortions.date));

  const map = new Map<string, any>();

  for (const row of rawData) {
    const cls = row.classroom;
    const mp = row.menuPlan;
    const st = row.storage;

    if (!map.has(cls.id)) {
      map.set(cls.id, {
        ...cls,
        menuPlan: mp?.id
          ? {
            id: mp.id,
            name: mp.name,
            date: mp.date,
          }
          : null,
        storages: [],
      });
    }

    const item = map.get(cls.id);

    if (st && st.id && !item.storages.some((s: any) => s.id === st.id)) {
      item.storages.push(st.imageURL);
    }
  }

  const finalData = Array.from(map.values());

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(beneficiaryPortions)
    .where(and(...whereConditions));

  const total = Number(countRes[0].count);

  return {
    data: finalData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


export async function getBeneficiaryPortionsById(id: string): Promise<any | null> {
  const rows = await db
    .select({
      classroom: beneficiaryPortions,
      menuPlan: {
        id: menuPlans.id,
        name: menuPlans.name,
        planStartDate: menuPlans.planStartDate,
        planEndDate: menuPlans.planEndDate,
      },
      storage: {
        id: storage.id,
        fileUrl: storage.fileUrl,
        createdAt: storage.createdAt,
        entityId: storage.entityId,
      },
    })
    .from(beneficiaryPortions)
    .leftJoin(menuPlans, eq(beneficiaryPortions.menuPlanId, menuPlans.id))
    .leftJoin(storage, eq(beneficiaryPortions.id, storage.entityId))
    .where(and(eq(beneficiaryPortions.id, id), eq(beneficiaryPortions.isDeleted, false)));

  if (rows.length === 0) return null;

  const firstRow = rows[0];
  const base = {
    ...firstRow.classroom,
    menuPlan: firstRow.menuPlan?.id
      ? {
        id: firstRow.menuPlan.id,
        name: firstRow.menuPlan.name,
        date: firstRow.menuPlan.planStartDate,
      }
      : null,
    storages: [] as string[],
  };

  for (const row of rows) {
    const st = row.storage;
    base.storages.push(st?.fileUrl || "");
  }

  return base;
}
export async function createBeneficiaryPortions(
  data: NewBeneficiaryPortions
): Promise<BeneficiaryPortions> {
  const [newClassroom] = await db
    .insert(beneficiaryPortions)
    .values({
      ...data,
      createdAt: new Date(),
      isDeleted: false,
    })
    .returning();
  return newClassroom;
}

export async function updateBeneficiaryPortions(
  id: string,
  data: UpdateBeneficiaryPortions
): Promise<BeneficiaryPortions | null> {
  const [updatedClassroom] = await db
    .update(beneficiaryPortions)
    .set({
      ...data,
    })
    .where(eq(beneficiaryPortions.id, id))
    .returning();
  return updatedClassroom ?? null;
}

export async function softDeleteBeneficiaryPortions(
  id: string,
  updatedBy: string
): Promise<BeneficiaryPortions | null> {
  const [deletedClassroom] = await db
    .update(beneficiaryPortions)
    .set({
      isDeleted: true,
      createdBy: updatedBy,
    })
    .where(eq(beneficiaryPortions.id, id))
    .returning();
  return deletedClassroom ?? null;
}

export async function bulkUpdateTotalStudents(
  updates: { id: string; totalRecipient: number; updatedBy: string; }[]
): Promise<BeneficiaryPortions[]> {
  if (updates.length === 0) return [];

  const results = await db.transaction(async (tx) => {
    const updated: BeneficiaryPortions[] = [];

    for (const { id, totalRecipient, updatedBy } of updates) {
      const [row] = await tx
        .update(beneficiaryPortions)
        .set({ totalRecipient, createdBy: updatedBy })
        .where(eq(beneficiaryPortions.id, id))
        .returning();

      if (row) updated.push(row);
    }

    return updated;
  });

  return results;
}
