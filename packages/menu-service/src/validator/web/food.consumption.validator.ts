import { z } from "zod";

export const CreateFoodConsumptionSchema = z.object({
  menuPlanId: z.string().uuid(),
  foodItemId: z.string().uuid(),
  quantity: z.string(),
  unit: z.string().min(1),
});

export const UpdateFoodConsumptionSchema = z.object({
  foodItemId: z.string().uuid().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
});

export const ListFoodConsumptionSchema = z.object({
  menuPlanId: z.string().uuid(),
});

export type CreateFoodConsumptionSchemaType =
  z.infer<typeof CreateFoodConsumptionSchema>;

export type UpdateFoodConsumptionSchemaType =
  z.infer<typeof UpdateFoodConsumptionSchema>;

export type ListFoodConsumptionSchemaType =
  z.infer<typeof ListFoodConsumptionSchema>;

export const ListFoodConsumptionQuerySchema = z.object({
  menuPlanId: z.string().uuid(),
});