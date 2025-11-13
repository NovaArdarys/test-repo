import { db } from "@/db";
import { menuPlanBeneficiaries, } from "@/db/schemas";
import { eq, and, sql, InferSelectModel, InferInsertModel } from "drizzle-orm";

export type MenuPlanSchools = InferSelectModel<typeof menuPlanBeneficiaries>;
export type NewMenuPlanSchools = Omit<
  InferInsertModel<typeof menuPlanBeneficiaries>,
  'id' | 'createdAt' | 'isDeleted'
>;

export async function assignPlanDistribution(data: NewMenuPlanSchools): Promise<MenuPlanSchools> {
  const [newItem] = await db.insert(menuPlanBeneficiaries).values(data).returning();
  return newItem;
}

export async function unassignPlanDistribution(menuPlanId: string, beneficiaryId: string): Promise<void> {
  await db.update(menuPlanBeneficiaries)
    .set({ isDeleted: true })
    .where(and(
      eq(menuPlanBeneficiaries.menuPlanId, menuPlanId),
      eq(menuPlanBeneficiaries.beneficiaryId, beneficiaryId),
    ));
}

export async function isPlanDistributionAssigned(menuPlanId: string, beneficiaryId: string): Promise<boolean> {
  const result = await db.select({ id: menuPlanBeneficiaries.id })
    .from(menuPlanBeneficiaries)
    .where(and(
      eq(menuPlanBeneficiaries.menuPlanId, menuPlanId),
      eq(menuPlanBeneficiaries.beneficiaryId, beneficiaryId),
      eq(menuPlanBeneficiaries.isDeleted, false)
    ))
    .limit(1);
  return result.length > 0;
}