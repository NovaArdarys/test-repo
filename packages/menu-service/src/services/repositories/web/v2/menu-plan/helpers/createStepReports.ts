import { Trx } from "../types/domain";
import { planEntity } from "../lib/stepFactory";
import { stepReports } from "@/db/schemas";

interface ExpandedStep {
  stepId: string;
  subDomain: string | null;
}

export default async function createStepReports(
  trx: Trx,
  dailyReportId: string,
  entityType: "kitchen" | "beneficiary",
  createdBy: string
): Promise<void> {
  const steps = await planEntity(entityType);

  const expanded: ExpandedStep[] = [];

  for (const step of steps) {
    const subs = Array.isArray(step.subDomains) ? step.subDomains : null;

    if (subs && subs.length > 0) {
      for (const sub of subs) {
        expanded.push({
          stepId: step.id,
          subDomain: sub,
        });
      }
    } else {
      expanded.push({
        stepId: step.id,
        subDomain: null,
      });
    }
  }

  await trx.insert(stepReports).values(
    expanded.map(s => ({
      dailyReportId,
      stepId: s.stepId,
      subDomain: s.subDomain,
      isCompleted: false,
      createdBy,
    }))
  );
}
