import { db } from "@/db";
import { masterSteps, stepKeyEnum } from "@/db/schemas";
import { and, eq } from "drizzle-orm";

type StepKey = (typeof stepKeyEnum.enumValues)[number];;
export interface StepTemplate {
  id: string;
  stepKey: StepKey;
  subDomains?: string[] | null;
}

export async function planEntity(
  entityType: "kitchen" | "beneficiary" | "driver"
): Promise<StepTemplate[]> {

  const rows = await db
    .select({
      id: masterSteps.id,
      stepKey: masterSteps.stepKey,
      subDomains: masterSteps.subDomains,
      targetEntity: masterSteps.entityType
    })
    .from(masterSteps)
    .where(and(eq(masterSteps.entityType, entityType), eq(masterSteps.isDeleted, false)));

  return rows.map(row => ({
    id: row.id,
    stepKey: row.stepKey,
    subDomains: Array.isArray(row.subDomains) ? row.subDomains : null
  }));
}
