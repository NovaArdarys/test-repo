import { db } from "@/db";
import { foodItems, } from "@/db/schemas"; // Asumsi skema Anda di sini
import { APIPagination } from "@/types/paginations.type";
import { eq, and, sql, desc, SQLWrapper, InferSelectModel, InferInsertModel, asc } from "drizzle-orm";
import { MenuPlan } from "./menu.plan.service";

export type FoodItem = InferSelectModel<typeof foodItems>;
export type NewFoodItem = Omit<
  InferInsertModel<typeof foodItems>,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'isAvailable'
> & { isAvailable?: boolean; };
export type UpdateFoodItem = Partial<Omit<NewFoodItem, 'createdBy'>> & { updatedBy: string; };
export type FoodType = FoodItem['type'];

export async function getFoodItemsList({
  page, limit, name, type, isAvailable, isDeleted = false
}: {
  page: number;
  limit: number;
  name?: string;
  type?: FoodType;
  isAvailable?: boolean;
  isDeleted?: boolean;
}): Promise<APIPagination<FoodItem>> {

  const offset = (page - 1) * limit;
  const whereConditions: SQLWrapper[] = [
    eq(foodItems.isDeleted, isDeleted),
  ];

  if (name) {
    whereConditions.push(sql`${foodItems.name} ILIKE ${'%' + name.toLowerCase() + '%'}`);
  }
  if (type) {
    whereConditions.push(eq(foodItems.type, type));
  }
  if (isAvailable !== undefined) {
    whereConditions.push(eq(foodItems.isAvailable, isAvailable));
  }

  const dataPromise = db.select()
    .from(foodItems)
    .where(and(...whereConditions))
    .limit(limit)
    .offset(offset)
    .orderBy(asc(foodItems.name));

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(foodItems)
    .where(and(...whereConditions));

  const [data, countResult] = await Promise.all([dataPromise, countPromise.execute()]);
  const total = Number(countResult[0].count);

  return {
    data: data as FoodItem[],
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}

export async function getFoodItemById(id: string): Promise<FoodItem | null> {
  const item = await db.query.foodItems.findFirst({
    where: (foodItems, { eq, and }) => and(
      eq(foodItems.id, id),
      eq(foodItems.isDeleted, false)
    ),
  });
  return item ?? null;
}

export async function createFoodItem(data: NewFoodItem): Promise<FoodItem> {
  const [newItem] = await db.insert(foodItems)
    .values({
      ...data,
      updatedAt: new Date(),
      updatedBy: data.createdBy,
    })
    .returning();
  return newItem;
}

export async function updateFoodItem(id: string, data: UpdateFoodItem): Promise<FoodItem | null> {
  const [updatedItem] = await db.update(foodItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(foodItems.id, id))
    .returning();
  return updatedItem ?? null;
}

export async function softDeleteFoodItem(id: string, updatedBy: string): Promise<FoodItem | null> {
  const [deletedItem] = await db.update(foodItems)
    .set({ isDeleted: true, updatedBy: updatedBy, updatedAt: new Date() })
    .where(eq(foodItems.id, id))
    .returning();
  return deletedItem ?? null;
}

export async function updateFoodItemAvailability(id: string, isAvailable: boolean, updatedBy: string): Promise<FoodItem | null> {
  const [updatedItem] = await db.update(foodItems)
    .set({ isAvailable, updatedBy, updatedAt: new Date() })
    .where(eq(foodItems.id, id))
    .returning();
  return updatedItem ?? null;
}