import { Hono } from "hono";
import { checkAccessToken } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate.middleware";

import {
  createSupplierFoodItemHandler,
  deleteSupplierFoodItemHandler,
  getSupplierFoodItemHandler,
  listSupplierFoodItemsHandler,
  updateSupplierFoodItemHandler,
} from "@/controllers/public/supplier.food.item.controller";

import { createSupplierFoodItemSchema, updateSupplierFoodItemSchema } from "@/validator/supplier.validator";

const app = new Hono();
app.use(checkAccessToken);

app.get("/", listSupplierFoodItemsHandler);

app.get("/:id", getSupplierFoodItemHandler);
app.post("/", validate(createSupplierFoodItemSchema), createSupplierFoodItemHandler);
app.put("/:id", validate(updateSupplierFoodItemSchema), updateSupplierFoodItemHandler);
app.delete("/:id", deleteSupplierFoodItemHandler);

export default app;
