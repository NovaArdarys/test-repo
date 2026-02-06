// services/repositories/menu.plan.distribute.service.ts
import { db } from "@/db";
import { safeRegenerateRouting } from "./v2/delivery/route.guard";

export async function distributeMenuPlan(
  menuPlanId: string,
  options: {
    force?: boolean;
    reason?: string;
    createdBy: string;
  }
) {
  await safeRegenerateRouting({
    menuPlanId,
    force: options.force ?? false,
    reason: options.reason ?? "manual_distribute",
  });

  return {
    menuPlanId,
    status: "DISTRIBUTED",
    force: options.force ?? false,
  };
}
