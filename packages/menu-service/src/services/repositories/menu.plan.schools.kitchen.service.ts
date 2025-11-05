import { db } from "@/db";
import { menuPlanSchools, } from "@/db/schemas";
import { eq, and, sql, InferSelectModel, InferInsertModel } from "drizzle-orm";

export type MenuPlanSchools = InferSelectModel<typeof menuPlanSchools>;
export type NewMenuPlanSchools = Omit<
  InferInsertModel<typeof menuPlanSchools>,
  'id' | 'createdAt' | 'isDeleted'
>;

export async function assignPlanDistribution(data: NewMenuPlanSchools): Promise<MenuPlanSchools> {
  const [newItem] = await db.insert(menuPlanSchools).values(data).returning();
  return newItem;
}

export async function unassignPlanDistribution(menuPlanId: string, schoolId: string): Promise<void> {
  await db.update(menuPlanSchools)
    .set({ isDeleted: true })
    .where(and(
      eq(menuPlanSchools.menuPlanId, menuPlanId),
      eq(menuPlanSchools.schoolId, schoolId),
    ));
}

export async function isPlanDistributionAssigned(menuPlanId: string, schoolId: string): Promise<boolean> {
  const result = await db.select({ id: menuPlanSchools.id })
    .from(menuPlanSchools)
    .where(and(
      eq(menuPlanSchools.menuPlanId, menuPlanId),
      eq(menuPlanSchools.schoolId, schoolId),
      eq(menuPlanSchools.isDeleted, false)
    ))
    .limit(1);
  return result.length > 0;
}