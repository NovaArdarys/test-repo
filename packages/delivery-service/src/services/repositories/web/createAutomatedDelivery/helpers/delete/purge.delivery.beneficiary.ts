import { deliveryBeneficiaries } from "@/db/schemas";
import { eq } from "drizzle-orm";

export default async function purgeDeliveryBeneficiaries(
  trx: any,
  menuPlanId: string
) {
  await trx.delete(deliveryBeneficiaries)
    .where(eq(deliveryBeneficiaries.menuPlanId, menuPlanId));
}