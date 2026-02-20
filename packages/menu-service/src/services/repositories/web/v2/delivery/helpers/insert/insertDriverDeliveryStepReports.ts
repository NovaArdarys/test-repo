// src/modules/steps/createDriverDeliveryStepReports.ts
import insertDeliveryStepReports from "./insertDeliveryStepReports";
import { StepKey, InsertedStepReport } from "./insertDriverStepReports";

export default async function createDriverDeliveryStepReports(
  trx: any,
  args: any,
  steps: InsertedStepReport[],
  {
    pickupId,
    dropoffId,
  }: {
    pickupId: string;
    dropoffId: string;
  }
): Promise<void> {
  for (const step of steps) {
    switch (step.stepKey as StepKey) {
      case "pickup":
        await insertDeliveryStepReports(
          trx,
          pickupId,
          args.data.createdBy,
          step.stepReportId
        );
        break;

      case "delivery":
        await insertDeliveryStepReports(
          trx,
          dropoffId,
          args.data.createdBy,
          step.stepReportId
        );
        break;
    }
  }
}
