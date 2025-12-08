import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { foodQueue } from "@/jobs/queue/food.queue";
import { storageCommittedSchema } from "@/validator/storage.validator";
import { safeConsume } from "../utils/consumerHelper";

// ===== QUEUES =====
const STORAGE_QUEUE_NAME = "ai_service_storage_queue";
const STORAGE_ROUTING_KEY = "storage.upload.commit";

// ================= HANDLERS =================

// Handle Storage Upload Event → enqueue ke Bull Queue
async function handleStorageEvent(data: z.infer<typeof storageCommittedSchema>) {
  const parsed = storageCommittedSchema.parse(data);

  await foodQueue.add("detection", parsed, {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 1000000,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  });

  console.log(`[AI WORKER] ✅ Job queued for detection [${parsed.storageId}]`);
}


// ================= SETUP =================
export async function setupAiServiceConsumers(channel: Channel) {
  // STORAGE Listener (storage.upload.commit)
  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  const storageQueue = await channel.assertQueue(STORAGE_QUEUE_NAME, { durable: true });
  await channel.bindQueue(storageQueue.queue, EXCHANGES.STORAGE, STORAGE_ROUTING_KEY);
  channel.prefetch(10);
  channel.consume(storageQueue.queue, safeConsume(handleStorageEvent, channel), { noAck: false });
  console.log(`[*] AI Service listening for STORAGE events in ${storageQueue.queue}`);
}
