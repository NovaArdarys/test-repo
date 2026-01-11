import z from "zod";
import { paginationSchema } from "./global.validator";
import { DeliveryBeneficiaryStatusTypeEnum } from "./delivery.enum";

// BASE

export const AssignBeneficiarySchema = z.object({
  beneficiaryId: z.string(),
  deliveryId: z.string(),
  menuPlanId: z.string(),
  notes: z.string().optional(),
});

// UPDATE

export const DeliveryBeneficiaryUpdateBodySchema = z.object({
  notes: z.string().optional(),
});

export const UpdateDeliveryBeneficiaryStatusSchema = z.object({
  status: DeliveryBeneficiaryStatusTypeEnum,
  deliveredAt: z.string().optional(),
});

// LIST QUERY

export const DeliveryBeneficiaryListQuerySchema = paginationSchema.extend({
  deliveryId: z.string().optional(),
  beneficiaryId: z.string().optional(),
  status: DeliveryBeneficiaryStatusTypeEnum.optional(),
  isDeleted: z
    .preprocess(
      (v) => v === "true" || v === true,
      z.boolean()
    )
    .optional(),
});

// LOCATION

export const RecordLocationSchema = z.object({
  lon: z.string(),
  lat: z.string(),
});

export const BulkRecordLocationSchema = z.array(RecordLocationSchema);

// TYPES 

export type AssignBeneficiarySchemaType = z.infer<
  typeof AssignBeneficiarySchema
>;
export type DeliveryBeneficiaryUpdateType = z.infer<
  typeof DeliveryBeneficiaryUpdateBodySchema
>;
export type UpdateDeliveryBeneficiaryStatusSchemaType = z.infer<
  typeof UpdateDeliveryBeneficiaryStatusSchema
>;
export type DeliveryBeneficiaryListQueryType = z.infer<
  typeof DeliveryBeneficiaryListQuerySchema
>;
export type RecordLocationSchemaType = z.infer<typeof RecordLocationSchema>;
export type BulkRecordLocationSchemaType = z.infer<
  typeof BulkRecordLocationSchema
>;
