import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { getFoodConsumptionItems, getFoodConsumptionItemById, softDeleteFoodConsumptionItem, upsertFoodConsumptionItems, createFoodConsumptionItems } from "@/services/repositories/web/food.consumption.service";
import {
  CreateFoodConsumptionSchemaType,
  UpdateFoodConsumptionSchemaType,
  ListFoodConsumptionSchemaType,
} from "@/validator/web/food.consumption.validator";


const getAuditFields = (c: Context) => ({
  userId: c.get("userId"),
});

export const listFoodConsumptionHandler = catchAsync(
  async (c: Context) => {
    const query =
      (await c.get("validatedData").query) as ListFoodConsumptionSchemaType;

    const rows = await getFoodConsumptionItems({
      menuPlanId: query.menuPlanId,
    });

    return c.json({ data: rows }, 200);
  },
);

export const createFoodConsumptionHandler = catchAsync(
  async (c: Context) => {
    const body =
      (await c.get("validatedData").body) as CreateFoodConsumptionSchemaType;
    const { userId } = getAuditFields(c);

    const row = await createFoodConsumptionItems({
      items: body.items,
      menuPlanId: body.menuPlanId,
      createdBy: userId,
    });

    return c.json(
      { data: row, message: "Food consumption created" },
      201,
    );
  },
);

export const getFoodConsumptionByIdHandler = catchAsync(
  async (c: Context) => {
    const { id } = c.req.param();

    const row = await getFoodConsumptionItemById(id);

    if (!row) {
      return c.json({ message: "Data not found" }, 404);
    }

    return c.json({ data: row }, 200);
  },
);

export const updateFoodConsumptionHandler = catchAsync(
  async (c: Context) => {
    const { id } = c.req.param();
    const body =
      (await c.get("validatedData").body) as UpdateFoodConsumptionSchemaType;
    const { userId } = getAuditFields(c);

    const row = await upsertFoodConsumptionItems({
      items: body.items,
      menuPlanId: body.menuPlanId,
      userId: userId,
    });

    return c.json(
      { data: row, message: "Food consumption updated" },
      200,
    );
  },
);

export const deleteFoodConsumptionHandler = catchAsync(
  async (c: Context) => {
    const { id } = c.req.param();
    const { userId } = getAuditFields(c);

    await softDeleteFoodConsumptionItem(id, userId);

    return c.json(
      { message: "Food consumption deleted" },
      200,
    );
  },
);
