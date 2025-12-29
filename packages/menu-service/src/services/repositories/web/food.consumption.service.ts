import { db } from "@/db";
import { foodConsumptionItems } from "@/db/schemas";
import { eq, and } from "drizzle-orm";

export async function createFoodConsumptionItem(data: {
  menuPlanId: string;
  foodItemId: string;
  quantity: string;
  unit: string;
  createdBy: string;
}) {
  const [row] = await db
    .insert(foodConsumptionItems)
    .values({
      ...data,
      updatedBy: data.createdBy,
      updatedAt: new Date(),
    })
    .returning();

  return row;
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

export async function updateFoodConsumptionItem(
  id: string,
  data: Partial<{
    foodItemId: string;
    quantity: string;
    unit: string;
    updatedBy: string;
  }>,
) {
  const [row] = await db
    .update(foodConsumptionItems)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(foodConsumptionItems.id, id))
    .returning();

  return row;
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
