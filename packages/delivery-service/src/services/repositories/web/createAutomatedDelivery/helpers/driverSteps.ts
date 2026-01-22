import { db } from "@/db";
import { masterSteps } from "@/db/schemas";
import { eq } from "drizzle-orm";

export interface DriverStepTemplate {
  id: string;
  stepKey: string;
  orderIndex: number;
}

export async function getStepTemplate(entityType: "driver"): Promise<DriverStepTemplate[]> {

  const rows = await db
    .select({
      id: masterSteps.id,
      stepKey: masterSteps.stepKey,
      orderIndex: masterSteps.stepOrder,
      entityType: masterSteps.entityType,
    })
    .from(masterSteps)
    .where(eq(masterSteps.entityType, entityType))
    .orderBy(masterSteps.stepOrder);

  return rows.map(r => ({
    id: r.id,
    stepKey: r.stepKey,
    orderIndex: r.orderIndex
  }));
}
