import { safePublish } from "../utils/publisherHelper";
import { EXCHANGES } from "../events/exchanges";
import { ProcessStatusPayload, processStatusSchema } from "@/validators/event/process.status.event";

async function publishProcessStatus(
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
      `[PROCESS STATUS] Published: ${routingKey} | ${validated.entityType} | ${validated.status} | kitchen:${validated.kitchenId} | to:${validated.userReceivedId}`
    );
  } catch (err) {
    console.error(`[PROCESS STATUS PUBLISH FAILED] ❌ ${routingKey}:`, err);
  }
}

export const processStatus = {
  queued: (data: ProcessStatusPayload) =>
    publishProcessStatus(
      `process.${data.entityType.toLowerCase()}.status.queued`,
      { ...data, status: "QUEUED" }
    ),
  processing: (data: ProcessStatusPayload) =>
    publishProcessStatus(
      `process.${data.entityType.toLowerCase()}.status.processing`,
      { ...data, status: "PROCESSING" }
    ),
  completed: (data: ProcessStatusPayload) =>
    publishProcessStatus(
      `process.${data.entityType.toLowerCase()}.status.completed`,
      { ...data, status: "COMPLETED" }
    ),
  failed: (data: ProcessStatusPayload) =>
    publishProcessStatus(
      `process.${data.entityType.toLowerCase()}.status.failed`,
      { ...data, status: "FAILED" }
    ),
  cancelled: (data: ProcessStatusPayload) =>
    publishProcessStatus(
      `process.${data.entityType.toLowerCase()}.status.cancelled`,
      { ...data, status: "CANCELLED" }
    ),
};