import { menuPlans } from "@/db/schemas";
import { gt, eq, and } from "drizzle-orm";
import { Trx } from "../../types/domain";

export async function fetchFutureMenuPlansByKitchen(
  trx: Trx,
  kitchenId: string
) {
  const today = new Date().toISOString().slice(0, 10);

  return trx
    .select()
    .from(menuPlans)
    .where(
      and(
        eq(menuPlans.kitchenId, kitchenId),
        gt(menuPlans.planStartDate, today)
      )
    );
}
