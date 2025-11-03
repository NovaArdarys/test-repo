import z from "zod";
import { paginationSchema } from "./globa.validator";

export const BulkFoodIdsItemSchema = z.string("ID komponen makanan harus berupa format UUID yang valid");

export const supplierBaseSchema = z.object({
  name: z.string().min(3, "Nama supplier minimal 3 karakter").max(100),
  kitchenId: z.string("Kitchen ID harus dalam format UUID.").optional(),
  phoneNumber: z.string().max(20).optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  foodIds: z.array(
    BulkFoodIdsItemSchema
  ).optional(),
});

export const createSupplierSchema = supplierBaseSchema.extend({});
export const updateSupplierSchema = supplierBaseSchema.partial();

export type CreateSupplierSchemaType = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierSchemaType = z.infer<typeof updateSupplierSchema>;

export const supplierFoodItemBaseSchema = z.object({
  supplierId: z.string("Supplier ID harus dalam format UUID."),
  foodItemId: z.string("Food Item ID harus dalam format UUID."),
  menuPlanId: z.string("Menu Plan ID harus dalam format UUID.").optional(),
});

export const createSupplierFoodItemSchema = supplierFoodItemBaseSchema.extend({});
export const updateSupplierFoodItemSchema = supplierFoodItemBaseSchema.partial();

export type CreateSupplierFoodItemSchemaType = z.infer<typeof createSupplierFoodItemSchema>;
export type UpdateSupplierFoodItemSchemaType = z.infer<typeof updateSupplierFoodItemSchema>;

export const ItemsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
});

export type ItemsQuerySchemaType = z.infer<typeof ItemsQuerySchema>;
