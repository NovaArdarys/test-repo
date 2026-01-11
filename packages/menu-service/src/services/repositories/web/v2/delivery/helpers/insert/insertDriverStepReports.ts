import { stepReports } from "@/db/schemas";
import { getStepTemplate } from "../driverSteps";

export default async function insertDriverStepReports(
  trx: any,
  args: any,
  dailyReportId: string
): Promise<void> {

  const steps = await getStepTemplate("driver");

  const batch = steps.map(step => ({
    dailyReportId,
    stepId: step.id,
    isCompleted: false,
    createdBy: args.driver.userId,
  }));

  await trx.insert(stepReports).values(batch);
}
