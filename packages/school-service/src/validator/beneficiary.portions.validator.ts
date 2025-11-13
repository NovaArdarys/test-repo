import { z } from "zod";

export const CreateBeneficiaryPortionsSchema = z.object({
  beneficiaryId: z.string(),
  menuPlanId: z.string().optional(),
  date: z.string().optional(),
  name: z.string().min(1, "Class name is required").max(100),
  totalRecipient: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(1)).optional(),
  storageId: z.string().nullable().optional(),
  portionType: z.string(),
});

export type CreateBeneficiaryPortionsSchemaType = z.infer<typeof CreateBeneficiaryPortionsSchema>;

export const BulkUpdateTotalBeneficiarySchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      totalRecipient: z.number().min(0),
      updatedBy: z.string(),
    })
  ),
});

export type BulkUpdateTotalBeneficiarySchemaType = z.infer<typeof BulkUpdateTotalBeneficiarySchema>;

export const ListBeneficiaryPortionsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  name: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  beneficiaryId: z.string().optional(),
  portionType: z.string().optional(),
});

export type ListBeneficiaryPortionsQuerySchemaType = z.infer<typeof ListBeneficiaryPortionsQuerySchema>;