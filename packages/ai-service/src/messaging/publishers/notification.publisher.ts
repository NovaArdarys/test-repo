import { safePublish } from "../utils/publisherHelper";
import { EXCHANGES } from "../events/exchanges";
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

type AiStatusPayload = z.infer<typeof aiStatusSchema>;

async function publishAiStatus(routingKey: string, data: AiStatusPayload): Promise<void> {
  try {
    aiStatusSchema.parse(data);
    await safePublish(EXCHANGES.AI, routingKey, data);

    console.log(`[AI STATUS PUBLISH] ✅ Sent: ${routingKey}`);
  } catch (err) {
    console.error(`[AI STATUS PUBLISH FAILED] ❌ ${routingKey}:`, err);
  }
}

export const aiStatus = {
  queued: (data: AiStatusPayload) =>
    publishAiStatus("ai.status.queued", { ...data, status: "QUEUED" }),

  processing: (data: AiStatusPayload) =>
    publishAiStatus("ai.status.processing", { ...data, status: "PROCESSING" }),

  done: (data: AiStatusPayload) =>
    publishAiStatus("ai.status.done", { ...data, status: "DONE" }),

  failed: (data: AiStatusPayload) =>
    publishAiStatus("ai.status.failed", { ...data, status: "FAILED" }),
};
