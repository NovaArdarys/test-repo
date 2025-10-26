import { Hono } from "hono";
import { checkAccessToken } from "@/middleware/auth.middleware";
import {
  listSuppliersHandler,
  getSupplierHandler,
  createSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler,
} from "@/controllers/public/suppliers.controller";

const app = new Hono();
app.use(checkAccessToken);

app.get("/", listSuppliersHandler);
app.get("/:id", getSupplierHandler);
app.post("/", createSupplierHandler);
app.put("/:id", updateSupplierHandler);
app.delete("/:id", deleteSupplierHandler);

export default app;
