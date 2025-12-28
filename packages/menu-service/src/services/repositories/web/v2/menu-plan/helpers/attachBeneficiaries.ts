import { menuPlanBeneficiaries } from "@/db/schemas";
import { Trx, MenuPlan, Beneficiary } from "../types/domain";

export default async function attachBeneficiaries(
  trx: Trx,
  plan: MenuPlan,
  beneficiaries: Beneficiary[]
): Promise<void> {
  if (!beneficiaries.length) return;

  await trx.insert(menuPlanBeneficiaries).values(
    beneficiaries.map((b: Beneficiary) => ({
      beneficiaryId: b.id,
      menuPlanId: plan.id,
      createdAt: plan.createdAt,
      createdBy: plan.createdBy,
      smallPortion: b.smallPortion ?? 0,
      largePortion: b.largePortion ?? 0,
      smallDeliveryTime: b.smallDeliveryTime ?? null,
      largeDeliveryTime: b.largeDeliveryTime ?? null,
      lon: b.lon,
      lat: b.lat,
    }))
  );
}
