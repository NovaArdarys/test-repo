import { db } from "@/db";
import { masterSteps } from "@/db/schemas";
import { eq } from "drizzle-orm";

export interface StepTemplate {
  id: string;
  stepKey: string;
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
    .where(eq(masterSteps.entityType, entityType));

  return rows.map(row => ({
    id: row.id,
    stepKey: row.stepKey,
    subDomains: Array.isArray(row.subDomains) ? row.subDomains : null
  }));
}
