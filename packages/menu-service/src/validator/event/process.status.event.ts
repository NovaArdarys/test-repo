import { z } from "zod";

export const processStatusSchema = z.object({
  status: z.enum(["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
  entityType: z.enum([
    "MENU_PLAN",
    "DELIVERY",
    "KITCHEN_REPORT",
    "BENEFICIARY_REPORT",
    "STOCK_ADJUSTMENT",
    "AI_GENERATION",
  ]),
  entityId: z.string().optional(),
  kitchenId: z.string().min(1),
  jobId: z.string().optional(),
  date: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  step: z.string().optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string().default(() => new Date().toISOString()),
});

export type ProcessStatusPayload = z.infer<typeof processStatusSchema>;