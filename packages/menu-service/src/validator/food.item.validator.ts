import { z } from "zod";
import { paginationSchema } from "./globa.validator";
import { foodTypeEnum } from "@/db/schemas";

const foodItemBaseSchema = z.object({
  name: z.string().min(3).max(100),
  type: z.enum(foodTypeEnum.enumValues, {
    error: () => ({ message: `Invalid type: ${foodTypeEnum.enumValues.join(', ')}` }),
  }),
  description: z.string().optional(),
  isAvailable: z.coerce.boolean().optional(),
});

export const createFoodItemSchema = foodItemBaseSchema.extend({
  name: foodItemBaseSchema.shape.name.nonempty(),
  type: foodItemBaseSchema.shape.type.nonoptional(),
});

export type CreateFoodItemSchemaType = z.infer<typeof createFoodItemSchema>;

export const updateFoodItemSchema = foodItemBaseSchema.partial();

export type UpdateFoodItemSchemaType = z.infer<typeof updateFoodItemSchema>;

export const listFoodItemsQuerySchema = paginationSchema.extend({
  name: z.string().optional(),
  type: foodItemBaseSchema.shape.type.optional(),
  is_available: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    },
    z.preprocess((a) => a === 'true', z.boolean()).optional()
  ).optional(),
});

export type ListFoodItemsQuerySchemaType = z.infer<typeof listFoodItemsQuerySchema>;

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.preprocess((a) => a === 'true', z.boolean()),
});

export type ToggleAvailabilitySchemaType = z.infer<typeof toggleAvailabilitySchema>;