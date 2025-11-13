import { Hono } from "hono";
import { checkAccessToken } from "@/middleware/auth.middleware";
import {
  listSuppliersHandler,
  getSupplierHandler,
  createSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler,
} from "@/controllers/public/mobile/suppliers.controller";
import { validate } from "@/middleware/validate.middleware";
import { CreateSupplierSchema, ItemsQuerySchema, UpdateSupplierSchema } from "@/validator/supplier.validator";
import { idParamSchema } from "@/validator/global.validator";

const app = new Hono();
app.use(checkAccessToken);

app.get("/", validate({ query: ItemsQuerySchema }), listSuppliersHandler);
app.get("/:id", validate({ param: idParamSchema }), getSupplierHandler);
app.post("/", validate({ body: CreateSupplierSchema }), createSupplierHandler);
app.put("/:id", validate({ body: UpdateSupplierSchema }), updateSupplierHandler);
app.delete("/:id", validate({ param: idParamSchema }), deleteSupplierHandler);

export default app;
