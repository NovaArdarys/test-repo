import { z } from "zod";
import { Channel } from "amqplib";
import { commitFileToMinio } from "@/utils/minioClient";
import { linkStorageToEntity } from "@/services/repositories/storage.service";
import { EXCHANGES } from "../events/exchanges";
import { safeConsume } from "../utils/consumerHelper";

// ===== VALIDATORS =====
const storageCommitSchema = z.object({
  tempPath: z.string(),
  targetPath: z.string(),
  tmpId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

// ===== QUEUES =====
const STORAGE_QUEUE_NAME = "storage_service_upload_commit_queue";
const STORAGE_ROUTING_KEY = "storage.upload.commit";
const LOG_QUEUE_NAME = "storage_service_log_queue";
const LOG_ROUTING_KEY = "log.#";

// ================= HANDLERS =================

// Storage Upload
async function handleStorageCommit(data: z.infer<typeof storageCommitSchema>) {
  const parsed = storageCommitSchema.parse(data);

  console.log("🪅 [STORAGE EVENT IN] Upload Commit:", parsed);

  await commitFileToMinio(parsed.tempPath, parsed.targetPath, parsed.meta);

  if (parsed.entityType && parsed.entityId) {
    await linkStorageToEntity(parsed.entityId, parsed.entityType as any);
    console.log(`[STORAGE WORKER] Linked file to ${parsed.entityType} (${parsed.entityId})`);
  }

  console.log(`[STORAGE WORKER] ✅ File committed: ${parsed.targetPath}`);
}

// Log 
async function handleLogEvent(data: any) {
  console.warn(`[LOG EVENT IN] [${data._meta?.routingKey ?? "log"}]`, data);
}

export async function setupStorageConsumer(channel: Channel) {
  // Log   await channel.assertExchange(EXCHANGES.LOG, "topic", { durable: true });
  const logQueue = await channel.assertQueue(LOG_QUEUE_NAME, { durable: true });
  await channel.bindQueue(logQueue.queue, EXCHANGES.LOG, LOG_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(logQueue.queue, safeConsume(handleLogEvent, channel), { noAck: false });
  console.log(`[*] Storage Service listening for LOG events in ${logQueue.queue}`);

  // Storage
  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, { durable: true });
  await channel.bindQueue(storageQueue.queue, EXCHANGES.STORAGE, STORAGE_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(storageQueue.queue, safeConsume(handleStorageCommit, channel), { noAck: false });
  console.log(`[*] Storage Service listening for STORAGE events in ${storageQueue.queue}`);
}
