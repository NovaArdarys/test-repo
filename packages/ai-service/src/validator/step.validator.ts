import { entityTypeEnum } from "@/db/schemas";
import z from "zod";

const entityTypeValidator = z.enum(entityTypeEnum.enumValues);

export const stepCommittedSchema = z.object({
  id: z.string(),
  menuPlanId: z.string(),
  entityType: entityTypeValidator,
  entityId: z.string(),
  allStepCompleted: z.boolean(),
  dailyReportId: z.string().optional(),
  storageId: z.string().optional(),
  stepKey: z.string().optional(),
  createdBy: z.string().optional(),
  aiResultId: z.string().optional(),
});
