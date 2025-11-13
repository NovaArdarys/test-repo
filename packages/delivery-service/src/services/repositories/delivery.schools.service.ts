import { db } from "@/db";
import { deliveryBeneficiaries, beneficiaries, menuPlans, } from "@/db/schemas";
import { DeliveryBeneficiaryListQueryType } from "@/validator/delivery.school.validation";
import { eq, and, sql, InferSelectModel, InferInsertModel, desc, SQLWrapper } from "drizzle-orm";

export type DeliveryBeneficiary = InferSelectModel<typeof deliveryBeneficiaries>;

export type DeliveryBeneficiaryUpdateBody = {
  notes?: string;
};

export async function getDeliveryBeneficiaryById(id: string): Promise<DeliveryBeneficiary | null> {
  const record = await db.query.deliveryBeneficiaries.findFirst({
    where: (deliveryBeneficiaries, { eq, and }) => and(
      eq(deliveryBeneficiaries.id, id),
      eq(deliveryBeneficiaries.isDeleted, false)
    ),
  });
  return record ?? null;
}

export async function updateDeliveryBeneficiary(
  id: string,
): Promise<DeliveryBeneficiary | null> {
  const [updatedItem] = await db.update(deliveryBeneficiaries)
    .set({})
    .where(and(
      eq(deliveryBeneficiaries.id, id),
      eq(deliveryBeneficiaries.isDeleted, false)
    ))
    .returning();
  return updatedItem ?? null;
}

export async function softDeleteDeliveryBeneficiary(id: string): Promise<void> {
  await db.update(deliveryBeneficiaries)
    .set({ isDeleted: true })
    .where(eq(deliveryBeneficiaries.id, id));
}

export async function updateDeliveryBeneficiaryStatusById(
  id: string,
): Promise<DeliveryBeneficiary | null> {

  const record = await getDeliveryBeneficiaryById(id);

  if (!record) {
    return null;
  }

  const [updatedItem] = await db.update(deliveryBeneficiaries)
    .set({})
    .where(and(
      eq(deliveryBeneficiaries.deliveryId, record.deliveryId),
      eq(deliveryBeneficiaries.beneficiaryId, record.beneficiaryId),
      eq(deliveryBeneficiaries.isDeleted, false)
    ))
    .returning();

  return updatedItem ?? null;
}

export type NewDeliveryBeneficiary = Omit<
  InferInsertModel<typeof deliveryBeneficiaries>,
  'id' | 'createdAt' | 'isDeleted' | 'status'
>;

export async function getDeliveryBeneficiaryList({
  page, limit, deliveryId, beneficiaryId, status, isDeleted = false
}: DeliveryBeneficiaryListQueryType): Promise<{ data: DeliveryBeneficiary[], meta: { page: number, limit: number, total: number, totalPages: number; }; }> {

  const offset = (page - 1) * limit;
  const whereConditions: SQLWrapper[] = [eq(deliveryBeneficiaries.isDeleted, isDeleted)];

  if (deliveryId) whereConditions.push(eq(deliveryBeneficiaries.deliveryId, deliveryId));
  if (beneficiaryId) whereConditions.push(eq(deliveryBeneficiaries.beneficiaryId, beneficiaryId));

  const dataPromise = db.select()
    .from(deliveryBeneficiaries)
    .where(and(...whereConditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(deliveryBeneficiaries.createdAt));

  const countPromise = db.select({ count: sql<number>`count(*)` })
    .from(deliveryBeneficiaries)
    .where(and(...whereConditions));

  const [data, countResult] = await Promise.all([dataPromise, countPromise]);
  const total = Number(countResult[0].count);

  return {
    data: data as DeliveryBeneficiary[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function assignBeneficiaryToDelivery(data: NewDeliveryBeneficiary): Promise<DeliveryBeneficiary> {
  const [newItem] = await db.insert(deliveryBeneficiaries)
    .values({ ...data, })
    .returning();
  return newItem;
}

export async function unassignBeneficiaryFromDelivery(
  deliveryId: string,
  beneficiaryId: string
): Promise<void> {
  await db.update(deliveryBeneficiaries)
    .set({ isDeleted: true })
    .where(and(
      eq(deliveryBeneficiaries.deliveryId, deliveryId),
      eq(deliveryBeneficiaries.beneficiaryId, beneficiaryId)
    ));
}

export async function updateDeliveryBeneficiaryStatus(
  deliveryId: string,
  beneficiaryId: string,
  deliveredAt: Date | null = new Date()
): Promise<DeliveryBeneficiary | null> {

  const [updatedItem] = await db.update(deliveryBeneficiaries)
    .set({
    })
    .where(and(
      eq(deliveryBeneficiaries.deliveryId, deliveryId),
      eq(deliveryBeneficiaries.beneficiaryId, beneficiaryId),
      eq(deliveryBeneficiaries.isDeleted, false)
    ))
    .returning();
  return updatedItem ?? null;
}

export async function getBeneficiarysByDeliveryId(deliveryId: string): Promise<
  Array<{
    recordId: string;
    beneficiary: InferSelectModel<typeof beneficiaries>;
    menuPlan: InferSelectModel<typeof menuPlans>;
  }>
> {
  const beneficaryList = await db.select({
    recordId: deliveryBeneficiaries.id,
    beneficiary: beneficiaries,
    menuPlan: menuPlans,
  })
    .from(deliveryBeneficiaries)
    .innerJoin(beneficiaries, eq(deliveryBeneficiaries.beneficiaryId, beneficiaries.id))
    .innerJoin(menuPlans, eq(deliveryBeneficiaries.menuPlanId, menuPlans.id))
    .where(and(
      eq(deliveryBeneficiaries.deliveryId, deliveryId),
      eq(deliveryBeneficiaries.isDeleted, false),
      eq(beneficiaries.isDeleted, false)
    ));

  return beneficaryList as Array<any>;
}