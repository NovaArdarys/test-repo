import { entityTypeEnum } from "@/db/schemas";
import z from "zod";

const entityTypeValidator = z.enum(entityTypeEnum.enumValues, {
  error: () => ({ message: `Invalid type ${entityTypeEnum.enumValues.join(', ')}` }),
});

export type EntityType = z.infer<typeof entityTypeValidator>;

export const storageCommittedSchema = z.object({
  storageId: z.string(),
  url: z.string(),
  entityType: entityTypeValidator,
  entityId: z.string(),
  meta: z.record(z.string(), z.any()).optional(),
});

export type StorageCommittedType = z.infer<typeof storageCommittedSchema>;