import { stepReports, masterSteps, stepKeyEnum } from "@/db/schemas";
import { eq } from "drizzle-orm";

export type StepKey = (typeof stepKeyEnum.enumValues)[number];

export interface DriverStepReport {
  stepKey: StepKey;
  stepReportId: string;
}

export default async function getDriverStepReportsByDailyReportId(
  trx: any,
  dailyReportId: string
): Promise<DriverStepReport[]> {
  const rows = await trx
    .select({
      stepKey: masterSteps.stepKey,
      stepReportId: stepReports.id,
    })
    .from(stepReports)
    .innerJoin(masterSteps, eq(masterSteps.id, stepReports.stepId))
    .where(eq(stepReports.dailyReportId, dailyReportId));

  return rows.map((r: any) => ({
    stepKey: r.stepKey as StepKey,
    stepReportId: r.stepReportId,
  }));
}
