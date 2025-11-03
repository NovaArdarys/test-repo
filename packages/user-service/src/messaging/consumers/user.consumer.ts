import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { updateOrCreateUserDetails } from "@/services/repositories/user.detail.service";
import { entityTypeEnum } from "@/db/schemas";
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
const STORAGE_QUEUE_NAME = "user_service_storage_queue";
const STORAGE_ROUTING_KEY = "storage.upload.commit";

const LOG_QUEUE_NAME = "user_service_log_queue";
const LOG_ROUTING_KEY = "log.#";

// ================= HANDLERS =================

// Storage Upload Event
async function handleStorageEvent(data: z.infer<typeof storageCommittedSchema>) {
  const parsed = storageCommittedSchema.parse(data);

  if (parsed.entityType === "profile") {
    await updateOrCreateUserDetails(parsed.entityId, {
      storageId: parsed.storageId,
      imageURL: parsed.url,
      updated_by: parsed.meta?.uploadedBy,
      created_by: parsed.meta?.uploadedBy,
    });

    console.log(`[USER STORAGE EVENT] ✅ Updated user profile ${parsed.entityId}`);
  } else {
    console.log(`[USER STORAGE EVENT] ⚠️ Skipped entityType: ${parsed.entityType}`);
  }
}

// Log Event
async function handleLogEvent(data: any) {
  console.warn(`[LOG EVENT IN] [${data._meta?.routingKey ?? "log"}]`, data);
}

export async function setupUserServiceConsumers(channel: Channel) {
  // LOG
  await channel.assertExchange(EXCHANGES.LOG, "topic", { durable: true });
  const logQueue = await channel.assertQueue(LOG_QUEUE_NAME, { durable: true });
  await channel.bindQueue(logQueue.queue, EXCHANGES.LOG, LOG_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(logQueue.queue, safeConsume(handleLogEvent, channel), { noAck: false });
  console.log(`[*] User Service listening for LOG events in ${logQueue.queue}`);

  // STORAGE
  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, { durable: true });
  await channel.bindQueue(storageQueue.queue, EXCHANGES.STORAGE, STORAGE_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(storageQueue.queue, safeConsume(handleStorageEvent, channel), { noAck: false });
  console.log(`[*] User Service listening for STORAGE events in ${storageQueue.queue}`);
}
