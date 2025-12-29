import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { permission } from "@/middleware/permission.middleware";
import { checkAccessToken } from "@/middleware/auth.middleware";

import { idParamSchema } from "@/validator/globa.validator";
import {
  CreateFoodConsumptionSchema,
  UpdateFoodConsumptionSchema,
  ListFoodConsumptionQuerySchema,
} from "@/validator/web/food.consumption.validator";

import {
  listFoodConsumptionHandler,
  createFoodConsumptionHandler,
  getFoodConsumptionByIdHandler,
  updateFoodConsumptionHandler,
  deleteFoodConsumptionHandler,
} from "@/controllers/public/web/food.consumtion.controller";

const app = new Hono();

app.use(checkAccessToken);

app.get(
  "/",
  permission(),
  validate(ListFoodConsumptionQuerySchema, "query"),
  listFoodConsumptionHandler,
);

app.post(
  "/",
  permission(),
  validate(CreateFoodConsumptionSchema),
  createFoodConsumptionHandler,
);

app.get(
  "/:id",
  permission(),
  validate(idParamSchema, "param"),
  getFoodConsumptionByIdHandler,
);

app.put(
  "/:id",
  permission(),
  validate(idParamSchema, "param"),
  validate(UpdateFoodConsumptionSchema),
  updateFoodConsumptionHandler,
);

app.delete(
  "/:id",
  permission(),
  validate(idParamSchema, "param"),
  deleteFoodConsumptionHandler,
);

export default app;
