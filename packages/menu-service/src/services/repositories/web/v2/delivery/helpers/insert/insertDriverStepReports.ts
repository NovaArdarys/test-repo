// src/modules/steps/insertDriverStepReports.ts
import { stepKeyEnum, stepReports } from "@/db/schemas";
import { getStepTemplate } from "../driverSteps";
import insertDeliveryStepReports from "./insertDeliveryStepReports";

export type StepKey = (typeof stepKeyEnum.enumValues)[number];
export default async function insertDriverStepReports(
  trx: any,
  args: any,
  dailyReportId: string,
  {
    pickupId,
    dropoffId,
  }: {
    pickupId: string;
    dropoffId: string;
  }
): Promise<void> {
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

  const stepReportByKey = new Map<StepKey, string>();

  steps.forEach((step, index) => {
    stepReportByKey.set(step.stepKey as StepKey, inserted[index].id);
  });

  for (const step of steps) {
    const stepReportId = stepReportByKey.get(step.stepKey as StepKey);
    if (!stepReportId) continue;

    switch (step.stepKey as StepKey) {
      case "pickup":
        await insertDeliveryStepReports(
          trx,
          pickupId,
          args.data.createdBy,
          stepReportId
        );
        break;

      case "delivery":
        await insertDeliveryStepReports(
          trx,
          dropoffId,
          args.data.createdBy,
          stepReportId
        );
        break;
    }
  }
}
