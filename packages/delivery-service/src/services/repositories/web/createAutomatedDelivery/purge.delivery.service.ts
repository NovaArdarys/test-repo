import { deliveries, deliveryBeneficiaries, deliveryStepReports } from "@/db/schemas";
import { purgeDailyReportsByMenuPlan } from "./helpers/delete/purge.daily.report";
import purgeDeliveryBeneficiaries from "./helpers/delete/purge.delivery.beneficiary";
import purgeDeliveryStepReports from "./helpers/delete/purge.delivery.step.report";
import { purgeDriverLocations } from "./helpers/delete/purge.driver.location";
import { Trx } from "./types/domain";
import { eq, inArray } from "drizzle-orm";

export async function purgeRoutingByMenuPlan(
  trx: Trx,
  menuPlanId: string,
) {

  const deliveryIds = await trx
    .select({ id: deliveryBeneficiaries.deliveryId })
    .from(deliveryBeneficiaries)
    .where(eq(deliveryBeneficiaries.menuPlanId, menuPlanId));

  const ids = deliveryIds.map(d => d.id);
  if (!ids.length) return;

  await purgeDeliveryStepReports(trx, menuPlanId);
  await purgeDeliveryBeneficiaries(trx, menuPlanId);
  await purgeDriverLocations(trx, ids);
  await purgeDailyReportsByMenuPlan(trx, menuPlanId);
}

export async function purgeRoutingByBeneficiary(
  trx: Trx,
  beneficiaryId: string
) {
  const dbRows = await trx
    .select({
      deliveryId: deliveryBeneficiaries.deliveryId,
      deliveryBeneficiaryId: deliveryBeneficiaries.id,
    })
    .from(deliveryBeneficiaries)
    .where(eq(deliveryBeneficiaries.beneficiaryId, beneficiaryId));

  if (!dbRows.length) return;

  const deliveryIds = dbRows.map(r => r.deliveryId);
  const deliveryBeneficiaryIds = dbRows.map(r => r.deliveryBeneficiaryId);

  await trx.delete(deliveryStepReports)
    .where(
      inArray(
        deliveryStepReports.deliveryBeneficiaryId,
        deliveryBeneficiaryIds
      )
    );

  await purgeDriverLocations(trx, deliveryIds);

  await trx.delete(deliveryBeneficiaries)
    .where(eq(deliveryBeneficiaries.beneficiaryId, beneficiaryId));

  await trx.delete(deliveries)
    .where(inArray(deliveries.id, deliveryIds));
}