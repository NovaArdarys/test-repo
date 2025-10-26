import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  getSupplierFoodItems,
  getSupplierFoodItemById,
  createSupplierFoodItem,
  updateSupplierFoodItem,
  deleteSupplierFoodItem,
} from "@/services/repositories/suppliers.food.items.service";
const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  updatedAt: new Date(),
  createdAt: new Date()
});

export const listSupplierFoodItemsHandler = catchAsync(async (c: Context) => {
  const supplierId = c.req.param("supplierId");
  const data = await getSupplierFoodItems(supplierId);
  return c.json({ data }, 200);
});

export const getSupplierFoodItemHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const data = await getSupplierFoodItemById(id);
  return c.json({ data }, 200);
});

export const createSupplierFoodItemHandler = catchAsync(async (c: Context) => {
  const body = await c.req.parseBody() as any;
  const audit = getAuditFields(c);
  const data = await createSupplierFoodItem({
    ...body, ...body,
    createdBy: audit.createdBy,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
    updatedBy: audit.updatedBy
  });

  return c.json({ data }, 201);
});

export const updateSupplierFoodItemHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const audit = getAuditFields(c);
  const data = await updateSupplierFoodItem(id, {
    ...body, ...body,
    createdBy: audit.createdBy,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
    updatedBy: audit.updatedBy
  });
  return c.json({ data }, 200);
});

export const deleteSupplierFoodItemHandler = catchAsync(async (c: Context) => {
  const id = c.req.param("id");
  const data = await deleteSupplierFoodItem(id);
  return c.json({ data }, 200);
});
