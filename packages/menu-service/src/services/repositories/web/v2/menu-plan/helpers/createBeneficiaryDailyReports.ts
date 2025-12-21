import { dailyReports } from "@/db/schemas";
import { Trx, MenuPlan, Beneficiary, DailyReport, PortionType } from "../types/domain";
import createStepReports from "./createStepReports";

export default async function createBeneficiaryDailyReports(
  trx: Trx,
  plan: MenuPlan,
  beneficiaries: Beneficiary[]
): Promise<DailyReport[]> {
  const reports: DailyReport[] = [];

  for (const b of beneficiaries) {
    const portions: PortionType[] = [];

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

      await createStepReports(trx, report.id, "beneficiary", plan.createdBy);

      reports.push(report satisfies DailyReport);
    }
  }

  return reports;
}
