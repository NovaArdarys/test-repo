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
  id: z.string(),
  kitchenId: z.string(),
  portionType: z.string(),
  targetPortion: z.number(),
  driverId: z.string(),
  startTime: z.string(),
  estimatedDeliveryTime: z.string(),
  notes: z.string(),
});

export const notifyJobSchema = z.object({
  deliveryId: z.string(),
  message: z.string().optional(),
});