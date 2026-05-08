import { z } from "zod";

export const processStatusSchema = z.object({
  status: z.enum(["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
  entityType: z.enum([
    "MENU_PLAN",
    "DELIVERY",
    "KITCHEN_REPORT",
    "BENEFICIARY_REPORT",
    "SYSTEM_REPORT",
    "AI_GENERATION",
    "QNA",
  ]),
  entityId: z.string().optional(),
  kitchenId: z.string().min(1),
  beneficiaryId: z.string().optional(),
  relatedId: z.string().optional(),
  relatedType: z.string().optional(),
  jobId: z.string().optional(),
  date: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  step: z.string().optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  userActorId: z.string(),
  userReceivedId: z.string(),
  title: z.string().min(1),
  message: z.string().optional(),
  timestamp: z.string().default(() => new Date().toISOString()),
  variant: z.enum(["information", "success", "warning"]).optional().default("information"),

});

export type ProcessStatusPayload = z.infer<typeof processStatusSchema>;