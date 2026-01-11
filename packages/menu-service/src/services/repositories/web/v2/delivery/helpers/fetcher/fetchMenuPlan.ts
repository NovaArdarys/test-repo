import { menuPlans } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { Trx, MenuPlan } from "../types/domain";

export default async function fetchMenuPlan(
  trx: Trx,
  menuPlanId: string
): Promise<MenuPlan> {

  const [plan] = await trx
    .select()
    .from(menuPlans)
    .where(eq(menuPlans.id, menuPlanId));

  if (!plan) {
    throw new Error("Menu plan not found");
  }

  return plan satisfies MenuPlan;
}
