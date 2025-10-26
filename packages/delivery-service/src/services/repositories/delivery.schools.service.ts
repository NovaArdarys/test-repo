import { db } from "@/db";
import { deliverySchools, schools, menuPlans, } from "@/db/schemas";
import { DeliverySchoolListQueryType } from "@/validator/delivery.school.validation";
import { eq, and, sql, InferSelectModel, InferInsertModel, desc, SQLWrapper } from "drizzle-orm";

export type DeliverySchool = InferSelectModel<typeof deliverySchools>;
export type DeliverySchoolStatus = DeliverySchool['status'];

export type DeliverySchoolUpdateBody = {
  notes?: string;
};

export async function getDeliverySchoolById(id: string): Promise<DeliverySchool | null> {
  const record = await db.query.deliverySchools.findFirst({
    where: (deliverySchools, { eq, and }) => and(
      eq(deliverySchools.id, id),
      eq(deliverySchools.isDeleted, false)
    ),
  });
  return record ?? null;
}

export async function updateDeliverySchool(
  id: string,
  data: DeliverySchoolUpdateBody
): Promise<DeliverySchool | null> {
  const [updatedItem] = await db.update(deliverySchools)
    .set({ ...data })
    .where(and(
      eq(deliverySchools.id, id),
      eq(deliverySchools.isDeleted, false)
    ))
    .returning();
  return updatedItem ?? null;
}

export async function softDeleteDeliverySchool(id: string): Promise<void> {
  await db.update(deliverySchools)
    .set({ isDeleted: true })
    .where(eq(deliverySchools.id, id));
}

export async function updateDeliverySchoolStatusById(
  id: string,
  status: DeliverySchoolStatus,
  deliveredAt: Date
): Promise<DeliverySchool | null> {

  const record = await getDeliverySchoolById(id);

  if (!record) {
    return null;
  }

  const [updatedItem] = await db.update(deliverySchools)
    .set({ status: status, deliveredAt: deliveredAt })
    .where(and(
      eq(deliverySchools.deliveryId, record.deliveryId),
      eq(deliverySchools.schoolId, record.schoolId),
      eq(deliverySchools.isDeleted, false)
    ))
    .returning();

  return updatedItem ?? null;
}

export type NewDeliverySchool = Omit<
  InferInsertModel<typeof deliverySchools>,
  'id' | 'createdAt' | 'isDeleted' | 'status'
> & { status?: DeliverySchoolStatus; };

export async function getDeliverySchoolsList({
  page, limit, deliveryId, schoolId, status, isDeleted = false
}: DeliverySchoolListQueryType): Promise<{ data: DeliverySchool[], meta: { page: number, limit: number, total: number, totalPages: number; }; }> {

  const offset = (page - 1) * limit;
  const whereConditions: SQLWrapper[] = [eq(deliverySchools.isDeleted, isDeleted)];

  if (deliveryId) whereConditions.push(eq(deliverySchools.deliveryId, deliveryId));
  if (schoolId) whereConditions.push(eq(deliverySchools.schoolId, schoolId));
  if (status) whereConditions.push(eq(deliverySchools.status, status));

  const dataPromise = db.select()
    .from(deliverySchools)
    .where(and(...whereConditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(deliverySchools.createdAt));

  const countPromise = db.select({ count: sql<number>`count(*)` })
    .from(deliverySchools)
    .where(and(...whereConditions));

  const [data, countResult] = await Promise.all([dataPromise, countPromise]);
  const total = Number(countResult[0].count);

  return {
    data: data as DeliverySchool[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function assignSchoolToDelivery(data: NewDeliverySchool): Promise<DeliverySchool> {
  const [newItem] = await db.insert(deliverySchools)
    .values({ ...data, status: data?.status || 'PENDING' })
    .returning();
  return newItem;
}

export async function unassignSchoolFromDelivery(
  deliveryId: string,
  schoolId: string
): Promise<void> {
  await db.update(deliverySchools)
    .set({ isDeleted: true })
    .where(and(
      eq(deliverySchools.deliveryId, deliveryId),
      eq(deliverySchools.schoolId, schoolId)
    ));
}

export async function updateDeliverySchoolStatus(
  deliveryId: string,
  schoolId: string,
  status: DeliverySchoolStatus,
  deliveredAt: Date | null = new Date()
): Promise<DeliverySchool | null> {

  const [updatedItem] = await db.update(deliverySchools)
    .set({
      status: status,
      deliveredAt: deliveredAt,
    })
    .where(and(
      eq(deliverySchools.deliveryId, deliveryId),
      eq(deliverySchools.schoolId, schoolId),
      eq(deliverySchools.isDeleted, false)
    ))
    .returning();
  return updatedItem ?? null;
}

export async function getSchoolsByDeliveryId(deliveryId: string): Promise<
  Array<{
    recordId: string;
    school: InferSelectModel<typeof schools>;
    menuPlan: InferSelectModel<typeof menuPlans>;
    status: DeliverySchoolStatus;
    deliveredAt: Date | null;
  }>
> {
  const schoolsList = await db.select({
    recordId: deliverySchools.id,
    status: deliverySchools.status,
    deliveredAt: deliverySchools.deliveredAt,
    school: schools,
    menuPlan: menuPlans,
  })
    .from(deliverySchools)
    .innerJoin(schools, eq(deliverySchools.schoolId, schools.id))
    .innerJoin(menuPlans, eq(deliverySchools.menuPlanId, menuPlans.id))
    .where(and(
      eq(deliverySchools.deliveryId, deliveryId),
      eq(deliverySchools.isDeleted, false),
      eq(schools.isDeleted, false)
    ));

  return schoolsList as Array<any>;
}