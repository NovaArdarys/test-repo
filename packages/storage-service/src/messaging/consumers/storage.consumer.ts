import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { safeConsume } from "../utils/consumerHelper";
import { storageClientCommittedSchema } from "@/validator/storage.validator";
import { storageQueue } from "@/jobs/queue/storage.queue";

// ===== QUEUES =====
const CLIENT_STORAGE_QUEUE_NAME = "client_storage_commit_queue";
const CLIENT_STORAGE_ROUTING_KEY = "client.storage.commit";

const LOG_QUEUE_NAME = "storage_service_log_queue";
const LOG_ROUTING_KEY = "log.#";

// ================= HANDLERS =================
// Storage Listener from clinet
async function handleClientStorageCommit(data: z.infer<typeof storageClientCommittedSchema>) {
  const parsed = storageClientCommittedSchema.parse(data);

  // move file
  await storageQueue.add("storage.commit", parsed, {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
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

  const clientQueue = await channel.assertQueue(CLIENT_STORAGE_QUEUE_NAME, { durable: true });

  await channel.bindQueue(clientQueue.queue, EXCHANGES.BENEFICIARY, CLIENT_STORAGE_ROUTING_KEY);
  await channel.bindQueue(clientQueue.queue, EXCHANGES.REPORT, CLIENT_STORAGE_ROUTING_KEY);
  await channel.bindQueue(clientQueue.queue, EXCHANGES.STORAGE, CLIENT_STORAGE_ROUTING_KEY);
  await channel.bindQueue(clientQueue.queue, EXCHANGES.USER, CLIENT_STORAGE_ROUTING_KEY);
  await channel.bindQueue(clientQueue.queue, EXCHANGES.KITCHEN, CLIENT_STORAGE_ROUTING_KEY);

  channel.consume(
    clientQueue.queue,
    safeConsume(handleClientStorageCommit, channel),
    { noAck: false }
  );
  console.log(`[*] Storage Service listening for CLIENT STORAGE commits from SCHOOL, REPORT, STORAGE exchanges`);
}
