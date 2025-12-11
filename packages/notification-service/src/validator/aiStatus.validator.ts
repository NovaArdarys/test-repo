import { z } from "zod";

export const aiStatusSchema = z.object({
  status: z.enum(["QUEUED", "PROCESSING", "DONE", "FAILED"]),
  channel: z.string(),
  stepId: z.string(),
  storageId: z.string(),
  dailyReportId: z.string(),
  stepKey: z.string().optional(),
  jobId: z.string().optional(),
  result: z.any().optional(),
  error: z.string().optional()
});
