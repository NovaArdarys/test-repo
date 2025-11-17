
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
  domain: c.get('domain'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
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

export const createFoodItemHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as CreateFoodItemSchemaType;
  const audit = getAuditFields(c);

  const newFoodItem = await createFoodItem({
    ...body,
    createdBy: audit.createdBy,
  });

  return c.json({ data: newFoodItem, message: "Food item created" }, 201);
});

export const listMenuPlansByFoodItemIdHandler = catchAsync(async (c: Context) => {
  const { id: MenuPlanId } = c.req.param();

  const data = await getFoodItemsByMenuPlanId(MenuPlanId);

  return c.json({ data }, 200);
});

export const getFoodItemByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();

  const foodItem = await getFoodItemById(id);

  return c.json({ data: foodItem }, 200);
});

export const updateFoodItemHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.parseBody() as unknown as UpdateFoodItemSchemaType;
  const audit = getAuditFields(c);

  const updatedFoodItem = await updateFoodItem(id, {
    ...body,
    updatedBy: audit.updatedBy,
  });

  return c.json({ data: updatedFoodItem, message: "Food item updated." }, 200);
});

export const deleteFoodItemHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  await softDeleteFoodItem(id, audit.updatedBy);

  return c.json({ message: "food item deleted" }, 200);
});

export const toggleFoodItemAvailabilityHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const { isAvailable } = await c.req.parseBody() as unknown as ToggleAvailabilitySchemaType;
  const audit = getAuditFields(c);

  const updatedFoodItem = await updateFoodItemAvailability(id, isAvailable, audit.updatedBy);

  return c.json({ data: updatedFoodItem, message: "food item status updated" }, 200);
});