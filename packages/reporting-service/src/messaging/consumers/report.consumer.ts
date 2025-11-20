import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { entityTypeEnum } from "@/db/schemas";
import { updateStepReport } from "@/services/repositories/daily.report.service";
import { safeConsume } from "../utils/consumerHelper";

// ===== VALIDATORS =====
const entityTypeValidator = z.enum(entityTypeEnum.enumValues);

const storageCommittedSchema = z.object({
  storageId: z.string(),
  url: z.string(),
  entityType: entityTypeValidator,
  entityId: z.string(),
  meta: z.record(z.string(), z.any()).optional(),
});

// ===== QUEUES =====
const STORAGE_QUEUE_NAME = "report_service_storage_queue";
const STORAGE_ROUTING_KEY = "storage.upload.commit";

// ================= HANDLERS =================

// Storage Upload Event Handler
async function handleStorageEvent(data: z.infer<typeof storageCommittedSchema>) {
  const parsed = storageCommittedSchema.parse(data);

  const validEntityTypes = [
    "kitchen_daily_report",
    "driver_daily_report",
    "school_daily_report",
  ];

  if (!validEntityTypes.includes(parsed.entityType)) {
    console.log(`[REPORT EVENT] ⚠️ Skipped unsupported entityType: ${parsed.entityType}`);
    return;
  }

  await updateStepReport(parsed.entityId, {
    storageId: parsed.storageId,
    imageURL: parsed.url,
    updatedBy: parsed.meta?.uploadedBy,
    updatedAt: new Date(),
  });

  console.log(`[REPORT STORAGE EVENT] ✅ Updated ${parsed.entityType} (${parsed.entityId})`);
}

// Log Event Handler
async function handleLogEvent(data: any) {
  console.warn(`[LOG EVENT IN] [${data._meta?.routingKey ?? "log"}]`, data?._meta?.eventId);

}

export async function setupReportServiceConsumers(channel: Channel) {
  // STORAGE
  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, { durable: true });
  await channel.bindQueue(storageQueue.queue, EXCHANGES.STORAGE, STORAGE_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(storageQueue.queue, safeConsume(handleStorageEvent, channel), { noAck: false });
  console.log(`[*] Report Service listening for STORAGE events in ${storageQueue.queue}`);
}
