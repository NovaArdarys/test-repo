import { and, eq, inArray, lte } from "drizzle-orm";
import { deliveries, menuPlans } from "@/db/schemas";
import { Trx } from "./types/domain";
import { purgeRoutingByMenuPlan } from "./purge.delivery.service";
import { createAutoDelivery } from "./delivery.auto.v2.service";
import { driverRoutingSensitiveDiff } from "./lib/driverDiff";

export interface RegenerateRoutingInput {
  trx: Trx;
  menuPlanId: string;
  reason:
  | "DRIVER_CHANGED"
  | "BENEFICIARY_CHANGED"
  | "MENU_PLAN_CHANGED"
  | "MANUAL_TRIGGER";
}

export async function safeRegenerateRouting({
  trx,
  menuPlanId,
}: RegenerateRoutingInput) {
  const [menuPlan] = await trx
    .select()
    .from(menuPlans)
    .where(eq(menuPlans.id, menuPlanId));

  if (!menuPlan) {
    throw new Error("Menu plan not found");
  }

  const today = new Date().toISOString().slice(0, 10);

  if (menuPlan.planStartDate <= today) {
    throw new Error(
      `Routing regenerate blocked: menu plan already active (${menuPlan.planStartDate})`
    );
  }

  const activeDeliveries = await trx
    .select({ id: deliveries.id })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.isDeleted, false),
        inArray(deliveries.status, [
          "IN_PROGRESS",
          "DELIVERED",
        ])
      )
    );

  if (activeDeliveries.length > 0) {
    throw new Error(
      "Routing regenerate blocked: active deliveries exist"
    );
  }

  await purgeRoutingByMenuPlan(trx, menuPlanId);

  await createAutoDelivery({
    menuPlanId,
    kitchenId: menuPlan.kitchenId!,
    createdBy: menuPlan.createdBy,
  }, trx);

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
