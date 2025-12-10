import { entityTypeEnum } from "@/db/schemas";
import z from "zod";

const entityTypeValidator = z.enum(entityTypeEnum.enumValues);

export const dropoffJobSchema = z.object({
  menuPlanId: z.string(),
  entityType: entityTypeValidator,
  entityId: z.string(),
  allStepCompleted: z.boolean(),
});

export const pickupJobSchema = z.object({
  dropoffId: z.string(),
  kitchenId: z.string(),
  portionType: z.string(),
  targetPortion: z.number(),
});

export const notifyJobSchema = z.object({
  deliveryId: z.string(),
  message: z.string().optional(),
});