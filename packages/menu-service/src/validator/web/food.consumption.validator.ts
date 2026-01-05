import { z } from "zod";


export const FoodConsumptionItemSchema = z.object({
  foodItemId: z.string().uuid(),
  quantity: z.string(),
  unit: z.string().min(1),
});


export const CreateFoodConsumptionSchema = z.object({
  note: z.string().optional(),
  reason: z.string().optional(),
  menuPlanId: z.string().uuid(),
  items: z
    .array(FoodConsumptionItemSchema)
    .min(1, "Minimal 1 item makanan"),
});

export type CreateFoodConsumptionSchemaType =
  z.infer<typeof CreateFoodConsumptionSchema>;

export const UpdateFoodConsumptionSchema = z.object({
  note: z.string().optional(),
  reason: z.string().optional(),
  menuPlanId: z.string().uuid(),
  items: z
    .array(
      z.object({
        foodItemId: z.string().uuid(),
        quantity: z.string().optional(),
        unit: z.string().optional(),
      }),
    )
    .min(1),
});

export type UpdateFoodConsumptionSchemaType =
  z.infer<typeof UpdateFoodConsumptionSchema>;

export const ListFoodConsumptionSchema = z.object({
  menuPlanId: z.string().uuid(),
});


export type ListFoodConsumptionSchemaType =
  z.infer<typeof ListFoodConsumptionSchema>;

export const ListFoodConsumptionQuerySchema = z.object({
  menuPlanId: z.string().uuid(),
});