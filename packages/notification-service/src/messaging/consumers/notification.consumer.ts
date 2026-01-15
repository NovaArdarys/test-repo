// src/consumers/notification.consumer.ts
import { Channel } from "amqplib";
import { z } from "zod";
import { EXCHANGES } from "../events/exchanges";
import { resetQueuesIfDev, safeConsume } from "../utils/consumerHelper";
import { sendSseToChannel } from "@/controllers/public/notification.controller";

const aiStatusSchema = z.object({
  status: z.enum(["QUEUED", "PROCESSING", "DONE", "FAILED"]),
  channel: z.string(),
  stepId: z.string(),
  storageId: z.string(),
  dailyReportId: z.string(),
  stepKey: z.string().optional(),
  jobId: z.string().optional(),
  result: z.any().optional(),
  error: z.string().optional(),
});

const processStatusSchema = z.object({
  status: z.enum(["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
  entityType: z.string(),
  entityId: z.string().optional(),
  kitchenId: z.string().min(1),
  jobId: z.string().optional(),
  date: z.string().optional(),
  progress: z.number().optional(),
  step: z.string().optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string(),
});

const NOTIFICATION_QUEUE = "notification_status_queue";
const STATUS_ROUTING_PATTERN = "#.status.#"; // catch semua *.status.*

async function handleStatusEvent(data: unknown) {
  let parsed: any;
  let eventName: string;
  let channelKey: string;

  try {
    parsed = processStatusSchema.parse(data);
    const statusLower = parsed.status.toLowerCase();
    eventName = `${parsed.entityType.toLowerCase()}:${statusLower}`;
    channelKey = `kitchen:${parsed.kitchenId}`; // channel utama per kitchen
  } catch {
    parsed = aiStatusSchema.parse(data);
    eventName = `ai:${parsed.status.toLowerCase()}`;
    channelKey = parsed.channel;
  }

  try {
    await sendSseToChannel(channelKey, eventName, parsed);

    console.log(
      `[NOTIFICATION] SSE sent to ${channelKey} | event: ${eventName}`
    );
  } catch (err) {
    console.error("[SSE SEND FAILED]", err);
  }
}

export async function setupNotificationConsumer(channel: Channel) {
  await resetQueuesIfDev(channel, [
    NOTIFICATION_QUEUE,
    `${NOTIFICATION_QUEUE}.retry`,
  ]);

  const RETRY_EXCHANGE = `${EXCHANGES.NOTIFICATION}.retry`;

  await channel.assertExchange(EXCHANGES.AI, "topic", { durable: true });
  await channel.assertExchange(EXCHANGES.NOTIFICATION, "topic", { durable: true });
  await channel.assertExchange(RETRY_EXCHANGE, "topic", { durable: true });

  const queue = await channel.assertQueue(NOTIFICATION_QUEUE, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": RETRY_EXCHANGE,
    },
  });

  await channel.assertQueue(`${NOTIFICATION_QUEUE}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": 10000,
      "x-dead-letter-exchange": EXCHANGES.NOTIFICATION,
    },
  });

  await channel.bindQueue(queue.queue, EXCHANGES.AI, "ai.status.#");
  await channel.bindQueue(queue.queue, EXCHANGES.NOTIFICATION, "process.#.status.#");
  await channel.bindQueue(queue.queue, EXCHANGES.NOTIFICATION, "#.status.#");

  await channel.bindQueue(
    `${NOTIFICATION_QUEUE}.retry`,
    RETRY_EXCHANGE,
    "#.status.#"
  );

  channel.prefetch(20);

  channel.consume(
    queue.queue,
    safeConsume(handleStatusEvent, channel),
    { noAck: false }
  );

  console.log(
    `[NOTIFICATION] Listening on queue: ${queue.queue} for all status events`
  );
}