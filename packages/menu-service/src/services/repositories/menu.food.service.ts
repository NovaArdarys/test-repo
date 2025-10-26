import { db } from "@/db";
import { menuFoodItem } from "@/db/schemas";
import { APIPagination } from "@/types/paginations.type";
import { eq, and, sql, InferSelectModel, InferInsertModel, SQLWrapper, desc } from "drizzle-orm";

export type MenusFood = InferSelectModel<typeof menuFoodItem>;
export type NewMenusFood = Omit<
  InferInsertModel<typeof menuFoodItem>,
  'id' | 'createdAt' | 'isDeleted'
>;

export async function getMenusList({
  page, limit, isDeleted = false
}: {
  page: number;
  limit: number;
  isDeleted?: boolean;
}): Promise<APIPagination<MenusFood>> {

  const offset = (page - 1) * limit;
  const whereConditions: SQLWrapper[] = [
    eq(menuFoodItem.isDeleted, isDeleted),
  ];

  const dataPromise = db.select()
    .from(menuFoodItem)
    .where(and(...whereConditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(menuFoodItem.createdAt));

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(menuFoodItem)
    .where(and(...whereConditions));

  const [data, countResult] = await Promise.all([dataPromise, countPromise.execute()]);
  const total = Number(countResult[0].count);

  return {
    data: data as MenusFood[],
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}

export async function getMenuById(id: string): Promise<MenusFood | null> {
  const item = await db.query.menuFoodItem.findFirst({
    where: (menus, { eq, and }) => and(
      eq(menus.id, id),
      eq(menus.isDeleted, false)
    ),
  });
  return item ?? null;
}

export async function createMenu(data: NewMenusFood): Promise<MenusFood> {
  const [newItem] = await db.insert(menuFoodItem).values({ ...data }).returning();
  return newItem;
}

export async function updateMenu(id: string, data: NewMenusFood): Promise<MenusFood | null> {
  const [updatedItem] = await db.update(menuFoodItem).set({ ...data, }).where(eq(menuFoodItem.id, id)).returning();
  return updatedItem ?? null;
}

export async function softDeleteMenu(id: string, updatedBy: string): Promise<MenusFood | null> {
  const [deletedItem] = await db.update(menuFoodItem).set({ isDeleted: true }).where(eq(menuFoodItem.id, id)).returning();
  return deletedItem ?? null;
}

export async function assignFoodToMenuPlan(data: NewMenusFood): Promise<MenusFood> {
  const [newItem] = await db.insert(menuFoodItem).values(data).returning();
  return newItem;
}

export async function unassignFoodFromMenuPlan(foodItemId: string, menuFoodPlanId: string): Promise<void> {
  await db.update(menuFoodItem)
    .set({ isDeleted: true })
    .where(and(
      eq(menuFoodItem.foodItemId, foodItemId),
      eq(menuFoodItem.menuFoodPlanId, menuFoodPlanId)
    ));
}

export async function isFoodItemAssigned(foodItemId: string, menuFoodPlanId: string): Promise<boolean> {
  const result = await db.select({ id: menuFoodItem.id })
    .from(menuFoodItem)
    .where(and(
      eq(menuFoodItem.foodItemId, foodItemId),
      eq(menuFoodItem.menuFoodPlanId, menuFoodPlanId),
      eq(menuFoodItem.isDeleted, false)
    ))
    .limit(1);
  return result.length > 0;
}