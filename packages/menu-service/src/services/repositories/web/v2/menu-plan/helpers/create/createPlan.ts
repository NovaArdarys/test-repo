import { menuPlans } from "@/db/schemas";
import { CreateMenuPlanInput } from "../../types";
import { MenuPlan } from "../../types/domain";

export default async function createPlan(
  trx: any,
  data: CreateMenuPlanInput,
  kitchenId: string,
  date: Date
): Promise<MenuPlan> {
  const [row] = await trx.insert(menuPlans).values({
    ...data,
    planStartDate: date.toISOString(),
    planEndDate: date.toISOString(),
    kitchenId,
    villageId: "d3d3d3d3-3333-3333-3333-333333333334",
    status: data.status,
    updatedAt: new Date(),
    updatedBy: data.createdBy,
  }).returning();

  if (!row) {
    throw new Error("Failed to create menu plan");
  }

  return row satisfies MenuPlan;
}
