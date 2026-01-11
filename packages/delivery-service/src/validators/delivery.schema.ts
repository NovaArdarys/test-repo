import z from "zod";
import { paginationSchema } from "./global.validator";
import { DeliveryStatusTypeEnum } from "./delivery.enum";



const DeliveryBaseSchema = z.object({
  kitchenId: z.string(),
  driverId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  estimatedDeliveryTime: z.string(),
  notes: z.string().optional(),
  status: DeliveryStatusTypeEnum.optional(),
});

// CRUD

export const CreateDeliverySchema = DeliveryBaseSchema.extend({
  status: DeliveryStatusTypeEnum.default("PENDING").optional(),
});

export const UpdateDeliverySchema = DeliveryBaseSchema.partial();

// QUERY & STATUS

export const ListDeliveriesQuerySchema = paginationSchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const UpdateDeliveryStatusSchema = z.object({
  status: DeliveryStatusTypeEnum,
  imageUrl: z.string().url().optional(),
  storageId: z.string().optional(),
});

// TYPES

export type CreateDeliverySchemaType = z.infer<typeof CreateDeliverySchema>;
export type UpdateDeliverySchemaType = z.infer<typeof UpdateDeliverySchema>;
export type ListDeliveriesQuerySchemaType = z.infer<
  typeof ListDeliveriesQuerySchema
>;
export type UpdateDeliveryStatusSchemaType = z.infer<
  typeof UpdateDeliveryStatusSchema
>;
