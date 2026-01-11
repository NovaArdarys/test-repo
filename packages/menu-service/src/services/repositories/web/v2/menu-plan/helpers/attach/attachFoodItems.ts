import { menuFoodItem, suppliersFoodItems } from "@/db/schemas";
import { Trx, MenuPlan } from "../../types/domain";

export default async function attachFoodItems(
  trx: Trx,
  plan: MenuPlan,
  foodItemsIds: string[] | undefined
): Promise<void> {
  if (!foodItemsIds || foodItemsIds.length === 0) return;

  await trx.insert(menuFoodItem).values(
    foodItemsIds.map((foodItemId: string) => ({
      foodItemId,
      menuFoodPlanId: plan.id,
      createdAt: plan.createdAt,
      createdBy: plan.createdBy,
    }))
  );

  await trx.insert(suppliersFoodItems).values(
    foodItemsIds.map((foodItemId: string) => ({
      supplierId: null,
      foodItemId,
      menuPlanId: plan.id,
      createdAt: plan.createdAt,
      createdBy: plan.createdBy,
      updatedAt: new Date(),
      updatedBy: plan.createdBy,
    }))
  );
}
