import { z } from "zod";
import { paginationSchema } from "../globa.validator";
import { planStatusEnum } from "@/db/schemas";

export const BulkUpdateItemSchema = z.string("ID komponen makanan harus berupa format UUID yang valid");
export const BulkDateItemSchema = z.string("Date harus berupa format yang valid");
export const entityTypeEnum = z.enum(["kitchen", "driver", "school"]);

export type BulkUpdateItem = z.infer<typeof BulkUpdateItemSchema>;

export const listMenuPlansQuerySchema = paginationSchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(planStatusEnum.enumValues, {
    error: () => ({ message: `Status not valid: ${planStatusEnum.enumValues.join(', ')}` }),
  }).optional(),
});

export type ListMenuPlansQuerySchemaType = z.infer<typeof listMenuPlansQuerySchema>;