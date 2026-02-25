import { safePublish } from "../utils/publisherHelper";
import { EXCHANGES } from "../events/exchanges";
import {
  processStatusSchema,
  ProcessStatusPayload,
  ProcessStatus,
  EntityType,
} from "@/validator/event/process.status.event";

function buildRoutingKey(
  entityType: EntityType,
  status: ProcessStatus
): string {
  return `process.${entityType.toLowerCase()}.status.${status.toLowerCase()}`;
}

async function publishProcessStatus(
  status: ProcessStatus,
  payload: Omit<ProcessStatusPayload, "status" | "timestamp">
): Promise<void> {
  try {
    const validated = processStatusSchema.parse({
      ...payload,
      status,
      timestamp: new Date().toISOString(),
    });

    const routingKey = buildRoutingKey(
      validated.entityType,
      validated.status
    );

    await safePublish(EXCHANGES.NOTIFICATION, routingKey, validated);

    console.log(
      `[PROCESS STATUS] ✅ ${routingKey} | ${validated.entityType} | ${validated.status} | kitchen:${validated.kitchenId} | to:${validated.userReceivedId}`
    );
  } catch (err) {
    console.error(`[PROCESS STATUS PUBLISH FAILED] ❌`, err);
  }
}

export const processStatus = {
  queued: (data: Omit<ProcessStatusPayload, "status" | "timestamp">) =>
    publishProcessStatus("QUEUED", data),

  processing: (data: Omit<ProcessStatusPayload, "status" | "timestamp">) =>
    publishProcessStatus("PROCESSING", data),

  completed: (data: Omit<ProcessStatusPayload, "status" | "timestamp">) =>
    publishProcessStatus("COMPLETED", data),

  failed: (data: Omit<ProcessStatusPayload, "status" | "timestamp">) =>
    publishProcessStatus("FAILED", data),

  cancelled: (data: Omit<ProcessStatusPayload, "status" | "timestamp">) =>
    publishProcessStatus("CANCELLED", data),

  emit: (
    status: ProcessStatus,
    data: Omit<ProcessStatusPayload, "status" | "timestamp">
  ) => publishProcessStatus(status, data),
};