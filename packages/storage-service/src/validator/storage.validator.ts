import { entityTypeEnum } from "@/db/schemas";
import { z } from "zod";;

const entityTypeValidator = z.enum(entityTypeEnum.enumValues, {
  error: () => ({ message: `Invalid type ${entityTypeEnum.enumValues.join(', ')}` }),
});

export const uploadBodySchema = z.object({
  file: z.instanceof(File),
  entityType: entityTypeValidator,
  entityId: z.string().optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

export type uploadBodyType = z.infer<typeof uploadBodySchema>;
