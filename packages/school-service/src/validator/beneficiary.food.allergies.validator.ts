import { z } from "zod";

export const CreateBeneficiaryFoodAllergySchema = z.object({
  beneficiaryId: z.string(),
  totalAlergic: z.number().int().optional().default(0),
  foodAlergicId: z.string().optional().nullable(),
  foodAltId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const UpdateBeneficiaryFoodAllergySchema = z.object({
  totalAlergic: z.number().int().optional(),
  foodAlergicId: z.string().optional().nullable(),
  foodAltId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const GetBeneficiaryFoodAllergyListSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  beneficiaryId: z.string().optional(),
});

export const BulkUpsertBeneficiaryAllergySchema = z.object({
  beneficiaryId: z.uuid(),
  items: z.array(
    z.object({
      id: z.uuid().optional(),
      totalAlergic: z.number().int().optional(),
      foodAlergicId: z.uuid().nullable().optional(),
      foodAltId: z.uuid().nullable().optional(),
      description: z.string().nullable().optional()
    })
  )
});

export type BulkUpsertBeneficiaryAllergySchemaType =
  z.infer<typeof BulkUpsertBeneficiaryAllergySchema>;

export type CreateBeneficiaryFoodAllergySchemaType = z.infer<typeof CreateBeneficiaryFoodAllergySchema>;
export type UpdateBeneficiaryFoodAllergySchemaType = z.infer<typeof UpdateBeneficiaryFoodAllergySchema>;
export type GetBeneficiaryFoodAllergyListSchemaType = z.infer<typeof GetBeneficiaryFoodAllergyListSchema>;
