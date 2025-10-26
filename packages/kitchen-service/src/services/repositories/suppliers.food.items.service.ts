import { db } from "@/db";
import { suppliersFoodItems } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

export type SupplierFoodItem = InferSelectModel<typeof suppliersFoodItems>;
export type SupplierFoodItemInsert = InferInsertModel<typeof suppliersFoodItems>;

export async function getSupplierFoodItems(supplierId: string) {
  return await db.query.suppliersFoodItems.findMany({
    where: (t) => eq(t.supplierId, supplierId),
  });
}

export async function getSupplierFoodItemById(id: string) {
  return await db.query.suppliersFoodItems.findFirst({
    where: (t) => eq(t.id, id),
  });
}

export async function createSupplierFoodItem(data: SupplierFoodItemInsert) {
  return await db.insert(suppliersFoodItems).values(data).returning();
}

export async function updateSupplierFoodItem(id: string, data: Partial<SupplierFoodItemInsert>) {
  return await db.update(suppliersFoodItems)
    .set(data)
    .where(eq(suppliersFoodItems.id, id))
    .returning();
}

export async function deleteSupplierFoodItem(id: string) {
  return await db.update(suppliersFoodItems)
    .set({ isDeleted: true })
    .where(eq(suppliersFoodItems.id, id))
    .returning();
}
