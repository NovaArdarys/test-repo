import z from "zod";
import { paginationSchema } from "./globa.validator";
import { deliveryBeneficiaryStatusEnum, deliveryStatusEnum } from "@/db/schemas";

const DeliveryStatusTypeEnum = z.enum(deliveryStatusEnum.enumValues, {
  error: () => ({ message: `Invalid type ${deliveryStatusEnum.enumValues.join(', ')}` }),
});

export const DeliveryBeneficiaryStatusTypeEnum = z.enum(deliveryBeneficiaryStatusEnum.enumValues, {
  error: () => ({ message: `Invalid type ${deliveryBeneficiaryStatusEnum.enumValues.join(', ')}` }),
});

const DeliveryBaseSchema = z.object({
  kitchenId: z.string(),
  driverId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  estimatedDeliveryTime: z.string(),
  notes: z.string().optional(),
  status: DeliveryStatusTypeEnum.optional(),
});

export const CreateDeliverySchema = DeliveryBaseSchema.omit({ status: true }).extend({
  status: DeliveryStatusTypeEnum.default('PENDING').optional(),
});
export type CreateDeliverySchemaType = z.infer<typeof CreateDeliverySchema>;

export const UpdateDeliverySchema = DeliveryBaseSchema.partial();

export const ListDeliveriesQuerySchema = paginationSchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const UpdateDeliveryStatusSchema = z.object({
  status: DeliveryStatusTypeEnum,
  imageUrl: z.string().url().optional(),
  storageId: z.string().optional(),
});


export const AssignBeneficiarySchema = z.object({
  beneficiaryId: z.string(),
  menuPlanId: z.string(),
  notes: z.string().optional(),
});
export type AssignBeneficiarySchemaType = z.infer<typeof AssignBeneficiarySchema>;

export const UpdateDeliveryBeneficiaryStatusSchema = z.object({
  status: DeliveryBeneficiaryStatusTypeEnum,
  deliveredAt: z.string().optional(),
});

export const RecordLocationSchema = z.object({
  lon: z.string(),
  lat: z.string(),
});
export const BulkRecordLocationSchema = z.array(RecordLocationSchema);
export type RecordLocationSchemaType = z.infer<typeof RecordLocationSchema>;
export type UpdateDeliveryStatusSchemaType = z.infer<typeof UpdateDeliveryStatusSchema>;
export type ListDeliveriesQuerySchemaType = z.infer<typeof ListDeliveriesQuerySchema>;
export type UpdateDeliverySchemaType = z.infer<typeof UpdateDeliverySchema>;
export type BulkRecordLocationSchemaType = z.infer<typeof BulkRecordLocationSchema>;
