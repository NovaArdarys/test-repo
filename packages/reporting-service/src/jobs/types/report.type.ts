import { z } from "zod";

export const MenuPlanCreatedEventSchema = z.object({
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
});

export const ReportQueueSchema = z.object({
  type: z.enum(["create", "update"]),
  data: MenuPlanCreatedEventSchema
});

export type ReportQueueType = z.infer<
  typeof ReportQueueSchema
>;
export type MenuPlanCreatedEventType = z.infer<
  typeof MenuPlanCreatedEventSchema
>;
