import { z } from "zod";
import { paginationSchema } from "./globa.validator";
import { planStatusEnum } from "@/db/schemas";

export const BulkUpdateItemSchema = z.string("ID komponen makanan harus berupa format UUID yang valid");
export const BulkDateItemSchema = z.string("Date harus berupa format yang valid");
export const entityTypeEnum = z.enum(["kitchen", "driver", "school", "beneficiary"]);

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
  beneficiaryId: z.string().nonempty("School required"),
});

export type AssignPlanDistributionSchemaType = z.infer<typeof assignPlanDistributionSchema>;


export const unassignPlanDistributionQuerySchema = z.object({
  beneficiaryId: z.string().nonempty("Query param required"),
});

export type UnassignPlanDistributionQuerySchemaType = z.infer<typeof unassignPlanDistributionQuerySchema>;

export const retryFailedMenuJobsSchema = z.object({
  jobId: z.string().optional()
});
export type RetryFailedMenuJobsSchemaType = z.infer<typeof retryFailedMenuJobsSchema>;

export const fixBrokenMenuPlansSchema = z.object({
  kitchenId: z.string().optional()
});
export type FixBrokenMenuPlansSchemaType = z.infer<typeof fixBrokenMenuPlansSchema>;

export const overrideDriverSchema = z.object({
  driverId: z.string().nonempty("Driver ID required"),
  oldDriverUserId: z.string().optional(),
});
export type OverrideDriverSchemaType = z.infer<typeof overrideDriverSchema>;