import { db } from "@/db";
import { schoolClassroom, menuPlans, storage } from "@/db/schemas";
import { APIPagination } from "@/types/paginations.type";
import { eq, and, sql, desc, SQLWrapper, or } from "drizzle-orm";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type SchoolClassroom = InferSelectModel<typeof schoolClassroom>;
export type NewSchoolClassroom = Omit<
  InferInsertModel<typeof schoolClassroom>,
  "id" | "createdAt" | "isDeleted"
>;
export type UpdateSchoolClassroom = Partial<Omit<NewSchoolClassroom, "createdBy">> & {
  updatedBy: string;
};

export async function getSchoolClassroomList({
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
      sql`${schoolClassroom.name} ILIKE ${"%" + name.toLowerCase() + "%"}`
    );
  }

  if (schoolIds && schoolIds.length > 0) {
    const uuidArray = sql.raw(
      `ARRAY[${schoolIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
    );
    whereConditions.push(sql`${schoolClassroom.schoolId} = ANY(${uuidArray})`);
  }

  if (startDate && endDate) {
    whereConditions.push(
      sql`${schoolClassroom.date} BETWEEN ${startDate} AND ${endDate}`
    );
  } else if (startDate) {
    whereConditions.push(sql`${schoolClassroom.date} >= ${startDate}`);
  } else if (endDate) {
    whereConditions.push(sql`${schoolClassroom.date} <= ${endDate}`);
  }

  if (portionType !== undefined) {
    whereConditions.push(eq(schoolClassroom.portionType, portionType));
  }

  whereConditions.push(eq(schoolClassroom.isDeleted, isDeleted));

  const rawData = await db
    .select({
      classroom: schoolClassroom,
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
    .from(schoolClassroom)
    .leftJoin(menuPlans, eq(schoolClassroom.menuPlanId, menuPlans.id))
    .leftJoin(storage, eq(schoolClassroom.id, storage.entityId))
    .where(and(...whereConditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(schoolClassroom.date));

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
    .from(schoolClassroom)
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


export async function getSchoolClassroomById(id: string): Promise<any | null> {
  const rows = await db
    .select({
      classroom: schoolClassroom,
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
    .from(schoolClassroom)
    .leftJoin(menuPlans, eq(schoolClassroom.menuPlanId, menuPlans.id))
    .leftJoin(storage, eq(schoolClassroom.id, storage.entityId))
    .where(and(eq(schoolClassroom.id, id), eq(schoolClassroom.isDeleted, false)));

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
export async function createSchoolClassroom(
  data: NewSchoolClassroom
): Promise<SchoolClassroom> {
  const [newClassroom] = await db
    .insert(schoolClassroom)
    .values({
      ...data,
      createdAt: new Date(),
      isDeleted: false,
    })
    .returning();
  return newClassroom;
}

export async function updateSchoolClassroom(
  id: string,
  data: UpdateSchoolClassroom
): Promise<SchoolClassroom | null> {
  const [updatedClassroom] = await db
    .update(schoolClassroom)
    .set({
      ...data,
    })
    .where(eq(schoolClassroom.id, id))
    .returning();
  return updatedClassroom ?? null;
}

export async function softDeleteSchoolClassroom(
  id: string,
  updatedBy: string
): Promise<SchoolClassroom | null> {
  const [deletedClassroom] = await db
    .update(schoolClassroom)
    .set({
      isDeleted: true,
      createdBy: updatedBy,
    })
    .where(eq(schoolClassroom.id, id))
    .returning();
  return deletedClassroom ?? null;
}

export async function bulkUpdateTotalStudents(
  updates: { id: string; totalStudent: number; updatedBy: string; }[]
): Promise<SchoolClassroom[]> {
  if (updates.length === 0) return [];

  const results = await db.transaction(async (tx) => {
    const updated: SchoolClassroom[] = [];

    for (const { id, totalStudent, updatedBy } of updates) {
      const [row] = await tx
        .update(schoolClassroom)
        .set({ totalStudent, createdBy: updatedBy })
        .where(eq(schoolClassroom.id, id))
        .returning();

      if (row) updated.push(row);
    }

    return updated;
  });

  return results;
}
