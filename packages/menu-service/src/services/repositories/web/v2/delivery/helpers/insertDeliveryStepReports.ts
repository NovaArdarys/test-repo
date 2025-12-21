import { deliveryStepReports, masterSteps } from "@/db/schemas";
import { eq } from "drizzle-orm";

interface MasterStepRow {
  id: string;
  entityType: string;
  stepOrder?: number | null;
  stepKey?: string | null;
}

export default async function insertDeliveryStepReports(
  trx: any,
  deliveryBeneficiaryId: string,
  createdBy: string
): Promise<void> {

  const steps: MasterStepRow[] = await trx
    .select()
    .from(masterSteps)
    .where(eq(masterSteps.entityType, "driver"));

  if (steps.length === 0) return;

  await trx.insert(deliveryStepReports).values(
    steps.map((step: MasterStepRow) => ({
      deliveryBeneficiaryId,
      stepId: step.id,
      createdBy,
      createdAt: new Date(),
    }))
  );
}
