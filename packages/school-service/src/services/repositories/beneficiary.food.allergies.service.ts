import { db } from "@/db";
import { beneficiaryFoodAllergies } from "@/db/schemas";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type BeneficiaryFoodAllergy = InferSelectModel<typeof beneficiaryFoodAllergies>;
export type NewBeneficiaryFoodAllergy = Omit<
  InferInsertModel<typeof beneficiaryFoodAllergies>,
  "id" | "createdAt" | "updatedAt"
> & { createdBy: string; };

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function createBeneficiaryFoodAllergy(
  data: NewBeneficiaryFoodAllergy
): Promise<BeneficiaryFoodAllergy> {
  const [newRecord] = await db.insert(beneficiaryFoodAllergies)
    .values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return newRecord;
}

export async function getBeneficiaryFoodAllergyById(
  id: string
): Promise<BeneficiaryFoodAllergy | null> {
  const record = await db.query.beneficiaryFoodAllergies.findFirst({
    where: (bfa, { eq }) => eq(bfa.id, id),
  });
  return record ?? null;
}

export async function getBeneficiaryFoodAllergies(options?: {
  page?: number;
  limit?: number;
  beneficiaryId?: string;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const offset = (page - 1) * limit;

  const filters = and(
    options?.beneficiaryId
      ? eq(beneficiaryFoodAllergies.beneficiaryId, options.beneficiaryId)
      : undefined
  );

  const data = await db
    .select()
    .from(beneficiaryFoodAllergies)
    .where(filters)
    .orderBy(desc(beneficiaryFoodAllergies.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(beneficiaryFoodAllergies)
    .where(filters);

  const meta: PaginationMeta = {
    page,
    limit,
    total: Number(count),
    totalPages: Math.ceil(Number(count) / limit),
  };

  return { data, meta };
}

export async function updateBeneficiaryFoodAllergy(
  id: string,
  payload: Partial<BeneficiaryFoodAllergy>
) {
  const [updated] = await db
    .update(beneficiaryFoodAllergies)
    .set({ ...payload, updatedAt: new Date() })
    .where(eq(beneficiaryFoodAllergies.id, id))
    .returning();

  return updated;
}

export async function softDeleteBeneficiaryFoodAllergy(id: string, userId: string) {
  const [deleted] = await db
    .update(beneficiaryFoodAllergies)
    .set({
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(beneficiaryFoodAllergies.id, id))
    .returning();

  return deleted;
}

export async function bulkUpsertBeneficiaryFoodAllergies(
  beneficiaryId: string,
  items: Array<{
    id?: string;
    totalAlergic?: number;
    foodAlergicId?: string | null;
    foodAltId?: string | null;
    description?: string | null;
  }>,
  userId: string
) {
  return await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: beneficiaryFoodAllergies.id })
      .from(beneficiaryFoodAllergies)
      .where(eq(beneficiaryFoodAllergies.beneficiaryId, beneficiaryId));

    const existingIds = existing.map((e) => e.id);
    const incomingIds = items.filter(i => i.id).map(i => i.id!) ?? [];

    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

    if (toDelete.length > 0) {
      await tx
        .delete(beneficiaryFoodAllergies)
        .where(inArray(beneficiaryFoodAllergies.id, toDelete));
    }

    const updateItems = items.filter((i) => i.id);

    for (const item of updateItems) {
      await tx
        .update(beneficiaryFoodAllergies)
        .set({
          totalAlergic: item.totalAlergic,
          foodAlergicId: item.foodAlergicId,
          foodAltId: item.foodAltId,
          description: item.description,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(beneficiaryFoodAllergies.id, item.id!));
    }

    const newItems = items.filter((i) => !i.id);

    if (newItems.length > 0) {
      await tx.insert(beneficiaryFoodAllergies).values(
        newItems.map((item) => ({
          beneficiaryId,
          totalAlergic: item.totalAlergic,
          foodAlergicId: item.foodAlergicId,
          foodAltId: item.foodAltId,
          description: item.description,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        }))
      );
    }

    return { success: true };
  });
}