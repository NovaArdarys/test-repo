import { entityTypeEnum } from "@/db/schemas";
import { z } from "zod";

const entityTypeValidator = z.enum(entityTypeEnum.enumValues, {
  error: () => ({ message: `Invalid type ${entityTypeEnum.enumValues.join(', ')}` }),
});

const singleFileSchema = z.instanceof(File, { message: "File must be a valid File object" })
  .refine(file => file.size <= 5 * 1024 * 1024, { message: "File size max 5MB" })
  .refine(file => ["image/jpeg", "image/png", "application/pdf"].includes(file.type), {
    message: "Only JPEG, PNG, or PDF files are allowed",
  });

export const uploadFileSchema = z.union([
  singleFileSchema,
  z.array(singleFileSchema).nonempty({ message: "File array must contain at least one file" }),
]).optional();

export const uploadBodySchema = z.object({
  file: uploadFileSchema,
  entityType: entityTypeValidator,
  entityId: z.string().optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

// TypeScript type
export type uploadBodyType = z.infer<typeof uploadBodySchema>;

export const storageClientCommittedSchema = z.object({
  storageId: z.string(),
  entityType: entityTypeValidator,
  entityId: z.string(),
  meta: z.record(z.string(), z.any()).optional(),
});

export type StorageClientCommittedType = z.infer<typeof storageClientCommittedSchema>;
