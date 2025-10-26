import { db } from "@/db";
import { menuPlanSchoolsKitchen, } from "@/db/schemas";
import { eq, and, sql, InferSelectModel, InferInsertModel } from "drizzle-orm";

export type MenuPlanSchoolsKitchen = InferSelectModel<typeof menuPlanSchoolsKitchen>;
export type NewMenuPlanSchoolsKitchen = Omit<
  InferInsertModel<typeof menuPlanSchoolsKitchen>,
  'id' | 'createdAt' | 'isDeleted'
>;

export async function assignPlanDistribution(data: NewMenuPlanSchoolsKitchen): Promise<MenuPlanSchoolsKitchen> {
  const [newItem] = await db.insert(menuPlanSchoolsKitchen).values(data).returning();
  return newItem;
}

export async function unassignPlanDistribution(menuPlanId: string, schoolId: string, kitchenId: string): Promise<void> {
  await db.update(menuPlanSchoolsKitchen)
    .set({ isDeleted: true })
    .where(and(
      eq(menuPlanSchoolsKitchen.menuPlanId, menuPlanId),
      eq(menuPlanSchoolsKitchen.schoolId, schoolId),
      eq(menuPlanSchoolsKitchen.kitchenId, kitchenId)
    ));
}

export async function isPlanDistributionAssigned(menuPlanId: string, schoolId: string): Promise<boolean> {
  const result = await db.select({ id: menuPlanSchoolsKitchen.id })
    .from(menuPlanSchoolsKitchen)
    .where(and(
      eq(menuPlanSchoolsKitchen.menuPlanId, menuPlanId),
      eq(menuPlanSchoolsKitchen.schoolId, schoolId),
      eq(menuPlanSchoolsKitchen.isDeleted, false)
    ))
    .limit(1);
  return result.length > 0;
}