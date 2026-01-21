import { beneficiaryFoodAllergies, dailyReports, stepKeyEnum } from "@/db/schemas";
import { Trx, MenuPlan, Beneficiary, DailyReport, PortionType } from "../types/domain";
import createStepReports from "./createStepReports";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
type StepKey = (typeof stepKeyEnum.enumValues)[number];

export default async function createBeneficiaryDailyReports(
  trx: Trx,
  plan: MenuPlan,
  beneficiaries: Beneficiary[]
): Promise<DailyReport[]> {
  const reports: DailyReport[] = [];

  for (const b of beneficiaries) {
    const portions: PortionType[] = [];
    const ignoredStep: StepKey[] = [];

    const allergy = await db
      .select({ id: beneficiaryFoodAllergies.id })
      .from(beneficiaryFoodAllergies)
      .where(and(eq(beneficiaryFoodAllergies.beneficiaryId, b.id)))
      .limit(1);

    const hasFoodAllergy = allergy.length > 0;

    if (hasFoodAllergy) ignoredStep.push("alergic");

    if ((b.smallPortion ?? 0) > 0) portions.push("SMALL");
    if ((b.largePortion ?? 0) > 0) portions.push("LARGE");

    // default case
    if (!portions.length) portions.push("DEFAULT");

    for (const portion of portions) {
      const insertData = {
        date: plan.planStartDate,
        entityId: b.id,
        entityType: "beneficiary",
        menuPlanId: plan.id,
        portionType: portion,
        status: "PENDING",
        createdAt: plan.createdAt,
        createdBy: plan.createdBy,
      };

      const [report] = await trx.insert(dailyReports).values(insertData).returning();

      if (!report) {
        throw new Error("Failed to create beneficiary daily report");
      }

      await createStepReports(trx, report.id, "beneficiary", plan.createdBy, []);

      reports.push(report satisfies DailyReport);
    }
  }

  return reports;
}
