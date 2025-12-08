import { z } from "zod";

export const menuPlanJobSchema = z.object({
  type: z.enum(["create", "update"]),
  menuPlanId: z.string().optional(),
  data: z.any(),
  kitchenId: z.string().optional(),
  foodItemsIds: z.array(z.string()).optional(),
  dates: z.string(),
  updatedBy: z.string().optional(),
});

export type MenuPlanJob = z.infer<typeof menuPlanJobSchema>;
