
import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  ListFoodItemsQuerySchemaType,
  CreateFoodItemSchemaType,
  UpdateFoodItemSchemaType,
  ToggleAvailabilitySchemaType
} from "@/validator/food.item.validator";
import { createFoodItem, getFoodItemById, getFoodItemsList, softDeleteFoodItem, updateFoodItem, updateFoodItemAvailability } from "@/services/repositories/food.item.service";
import { getFoodItemsByMenuPlanId } from "@/services/repositories/menu.plan.service";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  schoolId: c.get("schoolId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date()
});

export const listFoodItemsHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as ListFoodItemsQuerySchemaType;

  const page = parseInt(String(query.page || 1));
  const limit = parseInt(String(query.limit || 10));
  const name = query.name;
  const type = query.type;
  const isAvailable = query.is_available;

  const data = await getFoodItemsList({
    page,
    limit,
    name,
    type,
    isAvailable,
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});
