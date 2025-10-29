import { z } from "zod";
import { paginationSchema } from "./globa.validator";
import { planStatusEnum } from "@/db/schemas";

export const BulkUpdateItemSchema = z.string("ID komponen makanan harus berupa format UUID yang valid");
export const BulkDateItemSchema = z.string("Date harus berupa format yang valid");
export const entityTypeEnum = z.enum(["kitchen", "driver", "school"]);

export type BulkUpdateItem = z.infer<typeof BulkUpdateItemSchema>;

const menuPlanBaseSchema = z.object({
  planStartDate: z.string().optional(),
  planEndDate: z.string().optional(),
  dates: z.array(
    BulkDateItemSchema
  ).optional(),
  villageId: z.string().optional(),
  kitchenId: z.string().optional(),
  name: z.string().optional(),
  foodIds: z.array(
    BulkUpdateItemSchema
  ).optional(),
});

export const createMenuPlanSchema = menuPlanBaseSchema.extend({
  // validasi cross-field tambahan :v
});

export type CreateMenuPlanSchemaType = z.infer<typeof createMenuPlanSchema>;

export const updateMenuPlanSchema = menuPlanBaseSchema.partial();

export type UpdateMenuPlanSchemaType = z.infer<typeof updateMenuPlanSchema>;

export const listMenuPlansQuerySchema = paginationSchema.extend({
  villageId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  entityType: entityTypeEnum,
  status: z.enum(planStatusEnum.enumValues, {
    error: () => ({ message: `Status not valid: ${planStatusEnum.enumValues.join(', ')}` }),
  }).optional(),
});

export type ListMenuPlansQuerySchemaType = z.infer<typeof listMenuPlansQuerySchema>;

export const updateMenuPlanStatusSchema = z.object({
  status: z.enum(planStatusEnum.enumValues, {
    error: "Status required",
  }),
});

export type UpdateMenuPlanStatusSchemaType = z.infer<typeof updateMenuPlanStatusSchema>;


export const assignFoodToMenuPlanSchema = z.object({
  foodItemId: z.string().nonempty(),
});

export type AssignFoodToMenuPlanSchemaType = z.infer<typeof assignFoodToMenuPlanSchema>;


export const assignPlanDistributionSchema = z.object({
  schoolId: z.string().nonempty("School required"),
  kitchenId: z.string().nonempty("Kitchen required"),
});

export type AssignPlanDistributionSchemaType = z.infer<typeof assignPlanDistributionSchema>;


export const unassignPlanDistributionQuerySchema = z.object({
  schoolId: z.string().nonempty("Query param required"),
  kitchenId: z.string().nonempty("Query param required"),
});

export type UnassignPlanDistributionQuerySchemaType = z.infer<typeof unassignPlanDistributionQuerySchema>;