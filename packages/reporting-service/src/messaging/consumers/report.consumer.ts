import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { entityTypeEnum } from "@/db/schemas";
import { updateStepReport } from "@/services/repositories/daily.report.service";
import { resetQueuesIfDev, safeConsume } from "../utils/consumerHelper";

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

export async function setupConsumer(channel: Channel) {
  await resetQueuesIfDev(channel, [
    STORAGE_QUEUE_NAME,
    `${STORAGE_QUEUE_NAME}.retry`,
  ]);

  const RETRY_EXCHANGE = `${EXCHANGES.STORAGE}.retry`;

  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  await channel.assertExchange(RETRY_EXCHANGE, "topic", { durable: true });

  const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": RETRY_EXCHANGE,
    },
  });

  await channel.assertQueue(`${STORAGE_QUEUE_NAME}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000, // delay retry 5 detik
      "x-dead-letter-exchange": EXCHANGES.STORAGE,
    },
  });

  await channel.bindQueue(
    storageQueue.queue,
    EXCHANGES.STORAGE,
    STORAGE_ROUTING_KEY
  );

  await channel.bindQueue(
    `${STORAGE_QUEUE_NAME}.retry`,
    RETRY_EXCHANGE,
    STORAGE_ROUTING_KEY
  );

  channel.prefetch(10);

  channel.consume(
    storageQueue.queue,
    safeConsume(handleStorageEvent, channel),
    { noAck: false }
  );

  console.log(
    `[*] Report Service listening for STORAGE events in ${storageQueue.queue}`
  );
}
