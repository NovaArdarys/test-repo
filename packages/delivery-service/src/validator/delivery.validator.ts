import z from "zod";
import { paginationSchema } from "./globa.validator";
import { deliverySchoolStatusEnum, deliveryStatusEnum } from "@/db/schemas";

const deliveryStatusTypeEnum = z.enum(deliveryStatusEnum.enumValues, {
  error: () => ({ message: `Invalid type ${deliveryStatusEnum.enumValues.join(', ')}` }),
});

export const deliverySchoolStatusTypeEnum = z.enum(deliverySchoolStatusEnum.enumValues, {
  error: () => ({ message: `Invalid type ${deliverySchoolStatusEnum.enumValues.join(', ')}` }),
});

const deliveryBaseSchema = z.object({
  kitchenId: z.string(),
  driverId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  estimatedDeliveryTime: z.string(),
  notes: z.string().optional(),
  status: deliveryStatusTypeEnum.optional(),
});

export const createDeliverySchema = deliveryBaseSchema.omit({ status: true }).extend({
  status: deliveryStatusTypeEnum.default('PENDING').optional(),
});
export type CreateDeliverySchemaType = z.infer<typeof createDeliverySchema>;

export const updateDeliverySchema = deliveryBaseSchema.partial();

export const listDeliveriesQuerySchema = paginationSchema.extend({
  status: deliveryStatusTypeEnum.optional(),
  kitchenId: z.string().optional(),
  driverId: z.string().optional(),
});

export const updateDeliveryStatusSchema = z.object({
  status: deliveryStatusTypeEnum,
});

export const assignSchoolSchema = z.object({
  schoolId: z.string(),
  menuPlanId: z.string(),
  notes: z.string().optional(),
});
export type AssignSchoolSchemaType = z.infer<typeof assignSchoolSchema>;

export const updateDeliverySchoolStatusSchema = z.object({
  status: deliverySchoolStatusTypeEnum,
  deliveredAt: z.string().optional(),
});

export const recordLocationSchema = z.object({
  driverId: z.string(),
  deliveryId: z.string(),
  lon: z.string(),
  lat: z.string(),
});
export type RecordLocationSchemaType = z.infer<typeof recordLocationSchema>;
export type UpdateDeliveryStatusSchemaType = z.infer<typeof updateDeliveryStatusSchema>;
export type ListDeliveriesQuerySchemaType = z.infer<typeof listDeliveriesQuerySchema>;
export type UpdateDeliverySchemaType = z.infer<typeof updateDeliverySchema>;
