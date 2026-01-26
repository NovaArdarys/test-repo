import { dailyReports } from "@/db/schemas";
import { Trx, MenuPlan, DailyReport } from "../../types/domain";
import createStepReports from "./createStepReports";

export default async function createKitchenDailyReport(
  trx: Trx,
  plan: MenuPlan
): Promise<DailyReport> {
  const insertData = {
    date: plan.planStartDate,
    entityId: plan.kitchenId,
    entityType: "kitchen",
    menuPlanId: plan.id,
    portionType: "DEFAULT" as const,
    status: "PENDING",
    createdAt: plan.createdAt,
    createdBy: plan.createdBy,
  };

  const [report] = await trx
    .insert(dailyReports)
    .values(insertData)
    .onConflictDoUpdate({
      target: [
        dailyReports.entityType,
        dailyReports.entityId,
        dailyReports.menuPlanId,
        dailyReports.date,
        dailyReports.portionType,
      ],
      set: {
        status: insertData.status,
        updatedAt: new Date(),
        updatedBy: insertData.createdBy,
      },
    })
    .returning();

  if (!report) {
    throw new Error("Failed to create kitchen daily report");
  }

  await createStepReports(
    trx,
    report.id,
    "kitchen",
    plan.createdBy
  );

  return report satisfies DailyReport;
}
