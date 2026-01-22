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
  createdBy: string,
  stepId: string
): Promise<void> {

  await trx.insert(deliveryStepReports).values({
    deliveryBeneficiaryId,
    stepId: stepId,
    createdBy,
    createdAt: new Date(),
  }
  );
}
