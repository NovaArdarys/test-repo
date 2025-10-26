import { z } from "zod";
import { paginationSchema } from "./globa.validator";

const menuBaseSchema = z.object({
  foodItemId: z.string(),
  menuFoodPlanId: z.string(),
});

export const createMenuSchema = menuBaseSchema.extend({
});

export type CreateMenuSchemaType = z.infer<typeof createMenuSchema>;

export const updateMenuSchema = menuBaseSchema.partial();

export type UpdateMenuSchemaType = z.infer<typeof updateMenuSchema>;

export const listMenusQuerySchema = paginationSchema.extend({
});

export type ListMenusQuerySchemaType = z.infer<typeof listMenusQuerySchema>;