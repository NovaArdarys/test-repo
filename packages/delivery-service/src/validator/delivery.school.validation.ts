import z from "zod";
import { paginationSchema } from "./globa.validator";
import { deliverySchoolStatusTypeEnum } from "./delivery.validator";

export const assignSchoolSchema = z.object({
  schoolId: z.string(),
  deliveryId: z.string(),
  menuPlanId: z.string(),
  notes: z.string().optional(),
});
export type AssignSchoolSchemaType = z.infer<typeof assignSchoolSchema>;

export const updateDeliverySchoolStatusSchema = z.object({
  status: deliverySchoolStatusTypeEnum,
  deliveredAt: z.string().optional(),
});

export const deliverySchoolUpdateBodySchema = z.object({
  notes: z.string().optional(),
});

export const deliverySchoolCreatebodySchema = assignSchoolSchema.extend({
});

export const deliverySchoolListQuerySchema = paginationSchema.extend({
  deliveryId: z.string().optional(),
  schoolId: z.string().optional(),
  status: deliverySchoolStatusTypeEnum,
  isDeleted: z.preprocess((a) => a === 'true', z.boolean())
});

export type DeliverySchoolListQueryType = z.infer<typeof deliverySchoolListQuerySchema>;

export type DeliverySchoolUpdateType = z.infer<typeof deliverySchoolUpdateBodySchema>;

export type UpdateDeliverySchoolStatusSchemaType = z.infer<typeof updateDeliverySchoolStatusSchema>;
export type DeliverySchoolCreatebodySchemaType = z.infer<typeof deliverySchoolCreatebodySchema>;
