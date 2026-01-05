import { db } from "@/db";
import { foodConsumptionItems } from "@/db/schemas";
import { eq, and, sql } from "drizzle-orm";

export async function createFoodConsumptionItems(data: {
  menuPlanId: string;
  items: {
    foodItemId: string;
    quantity: string;
    unit: string;
  }[];
  createdBy: string;
}) {
  if (data.items.length === 0) return [];

  const now = new Date();

  const rows = await db
    .insert(foodConsumptionItems)
    .values(
      data.items.map((item) => ({
        menuPlanId: data.menuPlanId,
        menuFoodItemId: item.foodItemId,
        quantity: item?.quantity?.trim() || "0",
        unit: item?.unit?.trim() || "g",
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
        updatedAt: now,
      })),
    )
    .returning();

  return rows;
}

export async function getFoodConsumptionItems(params: {
  menuPlanId: string;
}) {
  return db
    .select()
    .from(foodConsumptionItems)
    .where(
      and(
        eq(foodConsumptionItems.menuPlanId, params.menuPlanId),
        eq(foodConsumptionItems.isDeleted, false),
      ),
    );
}

export async function getFoodConsumptionItemById(id: string) {
  return db.query.foodConsumptionItems.findFirst({
    where: (f, { eq }) =>
      and(eq(f.id, id), eq(f.isDeleted, false)),
  });
}

export async function upsertFoodConsumptionItems(data: {
  menuPlanId: string;
  items: {
    foodItemId: string;
    quantity?: string;
    unit?: string;
  }[];
  userId: string;
}) {
  const now = new Date();

  return db.transaction(async (tx) => {
    await tx
      .update(foodConsumptionItems)
      .set({
        isDeleted: true,
        updatedBy: data.userId,
        updatedAt: now,
      })
      .where(eq(foodConsumptionItems.menuPlanId, data.menuPlanId));

    if (data.items.length === 0) return [];

    return tx
      .insert(foodConsumptionItems)
      .values(
        data.items.map((item) => ({
          menuPlanId: data.menuPlanId,
          menuFoodItemId: item.foodItemId,
          quantity: item.quantity?.trim() || "0",
          unit: item.unit?.trim() || "g",
          createdBy: data.userId,
          updatedBy: data.userId,
          updatedAt: now,
        })),
      )
      .returning();
  });
}

export async function softDeleteFoodConsumptionItem(
  id: string,
  updatedBy: string,
) {
  await db
    .update(foodConsumptionItems)
    .set({
      isDeleted: true,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(foodConsumptionItems.id, id));
}
