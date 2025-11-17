import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/services/repositories/suppliers.service";
import { CreateSupplierSchemaType, ItemsQuerySchemaType, UpdateSupplierFoodItemSchemaType } from "@/validator/supplier.validator";
import { updateSupplierFoodItem } from "@/services/repositories/suppliers.food.items.service";


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
export const updateSupplierFoods = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as unknown as UpdateSupplierFoodItemSchemaType;
  const id = c.req.param("id");

  const audit = getAuditFields(c);

  const data = await updateSupplierFoodItem(id, body);
  return c.json({ data }, 200);
});

