import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { resetQueuesIfDev, safeConsume } from "../utils/consumerHelper";
import { storageClientCommittedSchema } from "@/validator/storage.validator";
import { storageQueue } from "@/jobs/queue/storage.queue";
import { deleteFileFromMinio } from "@/utils/minioClient";

// ===== QUEUES =====
const CLIENT_STORAGE_QUEUE_NAME = "client_storage_commit_queue";
const CLIENT_STORAGE_ROUTING_KEY = "client.storage.commit";

const STORAGE_DELETE_QUEUE_NAME = "storage_delete_queue";
const STORAGE_DELETE_ROUTING_KEY = "storage.delete";

const LOG_QUEUE_NAME = "storage_service_log_queue";
const LOG_ROUTING_KEY = "log.#";

// ================= HANDLERS =================
async function handleStorageDelete(data: { storageIds: string[]; paths: string[] }) {
  await Promise.all(data.paths.map((path) => deleteFileFromMinio(path)));
}

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
  console.warn(`[LOG EVENT IN] [${data._meta?.routingKey ?? "log"}]`, data?._meta?.eventId);

}

export async function setupConsumer(channel: Channel) {
  await resetQueuesIfDev(channel, [
    CLIENT_STORAGE_QUEUE_NAME,
    `${CLIENT_STORAGE_QUEUE_NAME}.retry`,
    STORAGE_DELETE_QUEUE_NAME,
    LOG_QUEUE_NAME,
    `${LOG_QUEUE_NAME}.retry`,
  ]);
  channel.prefetch(10);

  /* =====================================================
   * LOG LISTENER
   * ===================================================== */
  const LOG_RETRY_EXCHANGE = `${EXCHANGES.LOG}.retry`;

  await channel.assertExchange(EXCHANGES.LOG, "topic", { durable: true });
  await channel.assertExchange(LOG_RETRY_EXCHANGE, "topic", { durable: true });

  const logQueue = await channel.assertQueue(LOG_QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": LOG_RETRY_EXCHANGE,
    },
  });

  await channel.assertQueue(`${LOG_QUEUE_NAME}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000,
      "x-dead-letter-exchange": EXCHANGES.LOG,
    },
  });

  await channel.bindQueue(
    logQueue.queue,
    EXCHANGES.LOG,
    LOG_ROUTING_KEY
  );

  await channel.bindQueue(
    `${LOG_QUEUE_NAME}.retry`,
    LOG_RETRY_EXCHANGE,
    LOG_ROUTING_KEY
  );

  channel.consume(
    logQueue.queue,
    safeConsume(handleLogEvent, channel),
    { noAck: false }
  );

  console.log(`[*] Storage Service listening for LOG events in ${logQueue.queue}`);

  /* =====================================================
   * CLIENT STORAGE COMMIT LISTENER
   * (upload image / file heavy)
   * ===================================================== */
  const CLIENT_STORAGE_RETRY_EXCHANGE = `${EXCHANGES.STORAGE}.retry`;

  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });
  await channel.assertExchange(CLIENT_STORAGE_RETRY_EXCHANGE, "topic", { durable: true });

  const clientQueue = await channel.assertQueue(CLIENT_STORAGE_QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": CLIENT_STORAGE_RETRY_EXCHANGE,
    },
  });

  await channel.assertQueue(`${CLIENT_STORAGE_QUEUE_NAME}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000,
      "x-dead-letter-exchange": EXCHANGES.STORAGE,
    },
  });

  await channel.bindQueue(
    clientQueue.queue,
    EXCHANGES.BENEFICIARY,
    CLIENT_STORAGE_ROUTING_KEY
  );
  await channel.bindQueue(
    clientQueue.queue,
    EXCHANGES.REPORT,
    CLIENT_STORAGE_ROUTING_KEY
  );
  await channel.bindQueue(
    clientQueue.queue,
    EXCHANGES.STORAGE,
    CLIENT_STORAGE_ROUTING_KEY
  );
  await channel.bindQueue(
    clientQueue.queue,
    EXCHANGES.USER,
    CLIENT_STORAGE_ROUTING_KEY
  );
  await channel.bindQueue(
    clientQueue.queue,
    EXCHANGES.KITCHEN,
    CLIENT_STORAGE_ROUTING_KEY
  );

  await channel.bindQueue(
    `${CLIENT_STORAGE_QUEUE_NAME}.retry`,
    CLIENT_STORAGE_RETRY_EXCHANGE,
    CLIENT_STORAGE_ROUTING_KEY
  );

  channel.consume(
    clientQueue.queue,
    safeConsume(handleClientStorageCommit, channel, {
      serviceName: "storage-listener",
      getIdempotencyKey: (data: z.infer<typeof storageClientCommittedSchema>) => `${data.entityId}:${data?.storageId}:${data.entityType}:${(data as any)?._meta?.eventId ?? "none"}`
    }),
    { noAck: false }
  );

  console.log(
    `[*] Storage Service listening for CLIENT STORAGE commits from multiple exchanges`
  );

  /* =====================================================
   * STORAGE DELETE LISTENER
   * ===================================================== */
  await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });

  const deleteQueue = await channel.assertQueue(STORAGE_DELETE_QUEUE_NAME, { durable: true });

  await channel.bindQueue(deleteQueue.queue, EXCHANGES.STORAGE, STORAGE_DELETE_ROUTING_KEY);

  channel.consume(
    deleteQueue.queue,
    safeConsume(handleStorageDelete, channel),
    { noAck: false }
  );

  console.log(`[*] Storage Service listening for DELETE events in ${deleteQueue.queue}`);
}
