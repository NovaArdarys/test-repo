import { z } from "zod";

export const triggerReportJobSchema = z.object({
  type: z.enum(["create", "update"]),
  data: z.object({
    sagaId: z.string(),
    jobId: z.string(),
    menuPlanId: z.string(),
    kitchenId: z.string(),
    planStartDate: z.string().optional(),
    beneficiaries: z.array(z.any()).optional(),
    eventType: z.string(),
    _meta: z
      .object({
        eventId: z.string().optional(),
        timestamp: z.string().optional(),
      })
      .optional(),
  }),
});