import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { foodQueue } from "@/jobs/queue/food.queue";
import { storageCommittedSchema } from "@/validator/storage.validator";
import { safeConsume } from "../utils/consumerHelper";

// ===== QUEUES =====
const STORAGE_QUEUE_NAME = "ai_service_storage_queue";
const STORAGE_ROUTING_KEY = "storage.upload.commit";

const LOG_QUEUE_NAME = "ai_service_log_queue";
const LOG_ROUTING_KEY = "log.#";

// ================= HANDLERS =================

// Handle Storage Upload Event → enqueue ke Bull Queue
async function handleStorageEvent(data: z.infer<typeof storageCommittedSchema>) {
  const parsed = storageCommittedSchema.parse(data);

  await foodQueue.add("detection", parsed, {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: true,
    removeOnFail: false,
  });

  console.log(`[AI WORKER] ✅ Job queued for detection [${parsed.storageId}]`);
}

// Handle Log Event
async function handleLogEvent(data: any) {
  console.warn(`[LOG EVENT IN] [${data._meta?.routingKey ?? "log"}]`, data?._meta?.eventId);
}

// ================= SETUP =================
export async function setupAiServiceConsumers(channel: Channel) {
  // LOG Listener
  await channel.assertExchange(EXCHANGES.LOG, "topic", { durable: true });
  const logQueue = await channel.assertQueue(LOG_QUEUE_NAME, { durable: true });
  await channel.bindQueue(logQueue.queue, EXCHANGES.LOG, LOG_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(logQueue.queue, safeConsume(handleLogEvent, channel), { noAck: false });
  console.log(`[*] AI Service listening for LOG events in ${logQueue.queue}`);

  // STORAGE Listener (storage.upload.commit)
  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, { durable: true });
  await channel.bindQueue(storageQueue.queue, EXCHANGES.STORAGE, STORAGE_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(storageQueue.queue, safeConsume(handleStorageEvent, channel), { noAck: false });
  console.log(`[*] AI Service listening for STORAGE events in ${storageQueue.queue}`);
}
