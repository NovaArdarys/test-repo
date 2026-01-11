import { Hono } from "hono";
import { checkAccessToken } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate.middleware";
import { idParamSchema } from "@/validators/global.validator";
import { updateSupplierFoods } from "@/controllers/public/mobile/suppliers.foods.controller";
import { UpdateSupplierFoodItemSchema } from "@/validators/supplier.validator";

const app = new Hono();
app.use(checkAccessToken);
app.put("/:id", validate({ body: UpdateSupplierFoodItemSchema }), updateSupplierFoods);

export default app;
