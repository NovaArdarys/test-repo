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
  page,
  limit,
  name,
  schoolId,
  isLargeClass,
  isDeleted = false,
}: {
  page: number;
  limit: number;
  name?: string;
  schoolId?: string;
  isLargeClass?: boolean;
  isDeleted?: boolean;
}): Promise<APIPagination<SchoolClassroom>> {
  const offset = (page - 1) * limit;
  const whereConditions: SQLWrapper[] = [];

  if (name) {
    whereConditions.push(
      sql`${schoolClassroom.name} ILIKE ${"%" + name.toLowerCase() + "%"}`
    );
  }

  if (schoolId) {
    whereConditions.push(eq(schoolClassroom.schoolId, schoolId));
  }

  if (isLargeClass !== undefined) {
    whereConditions.push(eq(schoolClassroom.isLargeClass, isLargeClass));
  }

  whereConditions.push(eq(schoolClassroom.isDeleted, isDeleted));

  const dataPromise = db.query.schoolClassroom.findMany({
    with: {
      menuPlan: true,
      storage: true,
    },
    where: and(...whereConditions),
    limit,
    offset,
    orderBy: desc(schoolClassroom.createdAt),
  });

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(schoolClassroom)
    .where(and(...whereConditions));

  const [data, countResult] = await Promise.all([dataPromise, countPromise.execute()]);
  const total = Number(countResult[0].count);

  return {
    data: data as SchoolClassroom[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getSchoolClassroomById(id: string): Promise<SchoolClassroom | null> {
  const classroom = await db.query.schoolClassroom.findFirst({
    with: {
      menuPlan: true,
      storage: true,
    },
    where: and(eq(schoolClassroom.id, id), eq(schoolClassroom.isDeleted, false)),
  });
  return classroom ?? null;
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
