// src/modules/steps/insertDriverStepReports.ts
import { stepKeyEnum, stepReports } from "@/db/schemas";
import { getStepTemplate } from "../driverSteps";

export type StepKey = (typeof stepKeyEnum.enumValues)[number];

export interface InsertedStepReport {
  stepKey: StepKey;
  stepReportId: string;
}

export default async function insertDriverStepReports(
  trx: any,
  args: any,
  dailyReportId: string,
): Promise<InsertedStepReport[]> {
  const steps = await getStepTemplate("driver");

  const inserted = await trx
    .insert(stepReports)
    .values(
      steps.map(step => ({
        dailyReportId,
        stepId: step.id,
        isCompleted: false,
        createdBy: args.driver.userId,
      }))
    )
    .returning({
      id: stepReports.id,
    });


  return steps.map((step, index) => ({
    stepKey: step.stepKey as StepKey,
    stepReportId: inserted[index].id,
  }));
}
