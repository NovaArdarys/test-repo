import { and, eq, inArray, lte } from "drizzle-orm";
import { deliveries, menuPlans, deliveryBeneficiaries } from "@/db/schemas";
import { Trx } from "./types/domain";
import { purgeRoutingByMenuPlan } from "./purge.delivery.service";
import { createAutoDelivery } from "./delivery.auto.v2.service";
import { driverRoutingSensitiveDiff } from "./lib/driverDiff";
import { db } from "@/db";
import fetchBeneficiaries from "./helpers/fetcher/fetchBeneficiaries";

export interface RegenerateRoutingInput {
  trx: Trx;
  menuPlanId: string;
  reason:
  | "DRIVER_CHANGED"
  | "BENEFICIARY_CHANGED"
  | "MENU_PLAN_CHANGED"
  | "MANUAL_TRIGGER";
}

export async function safeRegenerateRouting(args: {
  trx?: Trx;
  menuPlanId: string;
  reason: string;
  force?: boolean;
}) {
  const [plan] = await db
    .select()
    .from(menuPlans)
    .where(eq(menuPlans.id, args.menuPlanId));

  const result = await db.transaction(async trx => {
    const beneficiaries = await fetchBeneficiaries(trx, args.menuPlanId);
    if (beneficiaries) { }

  });


  if (!plan) return;

  const today = new Date().toISOString().slice(0, 10);

  if (!args.force && plan.planStartDate <= today) {
    return;
  }

  const hasRouting = await db
    .select({ id: deliveryBeneficiaries.id })
    .from(deliveryBeneficiaries)
    .where(eq(deliveryBeneficiaries.menuPlanId, plan.id))
    .limit(1);

  if (hasRouting.length) {
    await db.transaction(async (trx) => {
      await purgeRoutingByMenuPlan(trx, plan.id);
    });
  }

  await createAutoDelivery({
    kitchenId: plan.kitchenId!,
    menuPlanId: plan.id,
    createdBy: plan.createdBy,
  });
}



export async function handleDriverChange(
  trx: Trx,
  params: {
    before: any;
    after: any;
    affectedMenuPlanIds: string[];
  }
) {
  const { before, after, affectedMenuPlanIds } = params;

  const shouldRegenerate = driverRoutingSensitiveDiff(before, after);
  if (!shouldRegenerate) return;

  for (const menuPlanId of affectedMenuPlanIds) {
    await safeRegenerateRouting({
      trx,
      menuPlanId,
      reason: "DRIVER_CHANGED",
    });
  }
}
