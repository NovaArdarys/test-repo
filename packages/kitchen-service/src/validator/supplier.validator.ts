import z from "zod";
import { paginationSchema } from "./global.validator";

export const BulkFoodIdsItemSchema = z.string("ID komponen makanan harus berupa format UUID yang valid");

export const SupplierBaseSchema = z.object({
  name: z.string().min(3, "Nama supplier minimal 3 karakter").max(100),
  kitchenId: z.string("Kitchen ID harus dalam format UUID.").optional(),
  phoneNumber: z.string().max(20).optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  storageId: z.string().optional(),
  foodIds: z.array(
    BulkFoodIdsItemSchema
  ).optional(),
});

export const CreateSupplierSchema = SupplierBaseSchema.extend({});
export const UpdateSupplierSchema = SupplierBaseSchema.partial();

export type CreateSupplierSchemaType = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplierSchemaType = z.infer<typeof UpdateSupplierSchema>;

export const SupplierFoodItemBaseSchema = z.object({
  supplierId: z.string("Supplier ID harus dalam format UUID."),
  foodItemId: z.string("Food Item ID harus dalam format UUID."),
  menuPlanId: z.string("Menu Plan ID harus dalam format UUID.").optional(),
});

export const CreateSupplierFoodItemSchema = SupplierFoodItemBaseSchema.extend({});
export const UpdateSupplierFoodItemSchema = SupplierFoodItemBaseSchema.partial();

export type CreateSupplierFoodItemSchemaType = z.infer<typeof CreateSupplierFoodItemSchema>;
export type UpdateSupplierFoodItemSchemaType = z.infer<typeof UpdateSupplierFoodItemSchema>;

export const ItemsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  createdByKitchen: z.preprocess((a) => a === 'true', z.boolean())
});

export type ItemsQuerySchemaType = z.infer<typeof ItemsQuerySchema>;
