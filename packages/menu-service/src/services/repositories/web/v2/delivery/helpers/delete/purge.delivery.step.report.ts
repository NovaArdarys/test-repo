import { deliveryBeneficiaries, deliveryStepReports } from "@/db/schemas";
import { eq, inArray } from "drizzle-orm";

export default async function purgeDeliveryStepReports(
  trx: any,
  menuPlanId: string
) {
  return await trx.delete(deliveryStepReports)
    .where(
      inArray(
        deliveryStepReports.deliveryBeneficiaryId,
        trx.select({ id: deliveryBeneficiaries.id })
          .from(deliveryBeneficiaries)
          .where(eq(deliveryBeneficiaries.menuPlanId, menuPlanId))
      )
    );
}
