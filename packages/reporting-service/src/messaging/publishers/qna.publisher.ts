import { safePublish } from "../utils/publisherHelper";
import { EXCHANGES } from "../events/exchanges";
import { ProcessStatusPayload, processStatusSchema } from "@/validator/event/process.status.event";

export async function publishQnaNotification(
  routingKey: string,
  payload: ProcessStatusPayload
): Promise<void> {
  try {
    const validated = processStatusSchema.parse({
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    });

    await safePublish(EXCHANGES.NOTIFICATION, routingKey, validated);

    console.log(
      `[QNA NOTIFICATION] Published: ${routingKey} | ${validated.entityType} | entity:${validated.entityId}`
    );
  } catch (err) {
    console.error(`[QNA NOTIFICATION PUBLISH FAILED] ❌ ${routingKey}:`, err);
  }
}

export type QnaEventPayload = Omit<ProcessStatusPayload, "status" | "entityType" | "timestamp" | "variant"> & { variant?: ProcessStatusPayload["variant"] };

export const qnaEvent = {
  questionAnswered: (data: QnaEventPayload) =>
    publishQnaNotification(
      `process.qna.status.completed`,
      { ...data, status: "COMPLETED", entityType: "QNA" } as ProcessStatusPayload
    ),
  questionCreated: (data: QnaEventPayload) =>
    publishQnaNotification(
      `process.qna.status.queued`,
      { ...data, status: "QUEUED", entityType: "QNA" } as ProcessStatusPayload
    )
};
