import { entityTypeEnum } from "@/db/schemas";
import z from "zod";

const entityTypeValidator = z.enum(entityTypeEnum.enumValues);

export const stepCommittedSchema = z.object({
  id: z.string(),
  menuPlanId: z.string(),
  entityType: entityTypeValidator,
  entityId: z.string(),
  allStepCompleted: z.boolean(),
});
