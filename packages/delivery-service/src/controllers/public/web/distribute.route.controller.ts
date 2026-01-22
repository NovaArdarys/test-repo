// controllers/menu.plan.controller.ts
import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { safeRegenerateRouting } from "@/services/repositories/web/createAutomatedDelivery/route.guard";

export type DistributeMenuPlanSchemaType = {
  force?: boolean;
  reason?: string;
};

const getAuditFields = (c: Context) => ({
  createdBy: c.get("userId"),
  updatedBy: c.get("userId"),
  userId: c.get("userId"),
  domain: c.get("domain"),
  subDomain: c.get("subDomain"),
  kitchenId: c.get("kitchenId") as string[],
  isAppManager: c.get("isAppManager") as boolean,
});

export const distributeMenuPlanHandler = catchAsync(
  async (c: Context) => {
    const { id: menuPlanId } = c.req.param();
    const body =
      (await c.req.json()) as unknown as DistributeMenuPlanSchemaType;

    const audit = getAuditFields(c);

    const result = await distributeMenuPlan(menuPlanId, {
      force: body.force,
      reason: body.reason,
      createdBy: audit.createdBy,
    });

    return c.json(
      {
        data: result,
        message: "Menu plan distributed successfully",
      },
      200
    );
  }
);

async function distributeMenuPlan(
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