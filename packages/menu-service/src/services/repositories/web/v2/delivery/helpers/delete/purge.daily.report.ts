import { dailyReports, stepReports } from "@/db/schemas";
import { Trx } from "../../types/domain";
import { eq, inArray } from "drizzle-orm";

export async function purgeDailyReportsByMenuPlan(
  trx: Trx,
  menuPlanId: string
) {
  await trx.delete(stepReports)
    .where(
      inArray(
        stepReports.dailyReportId,
        trx.select({ id: dailyReports.id })
          .from(dailyReports)
          .where(eq(dailyReports.menuPlanId, menuPlanId))
      )
    );

  await trx.delete(dailyReports)
    .where(eq(dailyReports.menuPlanId, menuPlanId));
}
