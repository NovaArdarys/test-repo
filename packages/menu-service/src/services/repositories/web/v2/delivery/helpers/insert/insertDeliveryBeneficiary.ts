import { deliveryBeneficiaries } from "@/db/schemas";

export default async function insertDeliveryBeneficiary(
  trx: any,
  args: any,
  delivery: any,
  unit: any
) {
  const [inserted] = await trx
    .insert(deliveryBeneficiaries)
    .values({
      deliveryId: delivery.id,
      beneficiaryId: unit.beneficiaryId,
      menuPlanId: unit.menuPlanId,
      createdBy: args.data.createdBy,
      createdAt: new Date(),
    })
    .returning();

  return inserted;
}
