import z from "zod";
import { paginationSchema } from "./globa.validator";
import { DeliveryBeneficiaryStatusTypeEnum } from "./delivery.validator";

export const AssignBeneficiarySchema = z.object({
  beneficiaryId: z.string(),
  deliveryId: z.string(),
  menuPlanId: z.string(),
  notes: z.string().optional(),
});
export type AssignBeneficiarySchemaType = z.infer<typeof AssignBeneficiarySchema>;

export const UpdateDeliveryBeneficiaryStatusSchema = z.object({
  status: DeliveryBeneficiaryStatusTypeEnum,
  deliveredAt: z.string().optional(),
});

export const DeliveryBeneficiaryUpdateBodySchema = z.object({
  notes: z.string().optional(),
});

export const DeliveryBeneficiaryCreatebodySchema = AssignBeneficiarySchema.extend({
});

export const DeliveryBeneficiaryListQuerySchema = paginationSchema.extend({
  deliveryId: z.string().optional(),
  beneficiaryId: z.string().optional(),
  status: DeliveryBeneficiaryStatusTypeEnum,
  isDeleted: z.preprocess((a) => a === 'true', z.boolean())
});

export type DeliveryBeneficiaryListQueryType = z.infer<typeof DeliveryBeneficiaryListQuerySchema>;

export type DeliveryBeneficiaryUpdateType = z.infer<typeof DeliveryBeneficiaryUpdateBodySchema>;

export type UpdateDeliveryBeneficiaryStatusSchemaType = z.infer<typeof UpdateDeliveryBeneficiaryStatusSchema>;
export type DeliveryBeneficiaryCreatebodySchemaType = z.infer<typeof DeliveryBeneficiaryCreatebodySchema>;
