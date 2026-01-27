// src/consumers/notification.consumer.ts
import { Channel } from "amqplib";
import { z } from "zod";
import { EXCHANGES } from "../events/exchanges";
import { resetQueuesIfDev, safeConsume } from "../utils/consumerHelper";
import { sendSseToChannel } from "@/controllers/public/notification.controller";
import { createNotification } from "@/services/repositories/create.notification.service";

const processStatusSchema = z.object({
  status: z.enum(["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
  entityType: z.string(),
  entityId: z.string().optional(),
  kitchenId: z.string().min(1),
  beneficiaryId: z.string().optional(),
  relatedId: z.string().optional(),
  relatedType: z.string().optional(),
  jobId: z.string().optional(),
  date: z.string().optional(),
  progress: z.number().optional(),
  step: z.string().optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  userActorId: z.string(),
  userReceivedId: z.string(),
  title: z.string().min(1),
  message: z.string().optional(),
  timestamp: z.string(),
});

export type ProcessStatusPayload = z.infer<typeof processStatusSchema>;
export type ProcessStatusType = z.infer<typeof processStatusSchema>;

const NOTIFICATION_QUEUE = "notification_status_queue";

async function handleStatusEvent(data: unknown) {
  let payload: ProcessStatusType;
  let eventName: string;
  let channelKey: string;

  try {
    payload = processStatusSchema.parse(data);
    const statusLower = payload.status.toLowerCase();
    eventName = `${payload.entityType.toLowerCase()}:${statusLower}`;
    channelKey = `kitchen:${payload.kitchenId}`;

    await createNotification({
      userActorId: payload.userActorId,
      userReceivedId: payload.userReceivedId,
      type: `process.${payload.entityType.toLowerCase()}.${payload.status.toLowerCase()}`,
      title: payload.title,
      message: payload.message || null,
      payload: {
        entityId: payload.entityId,
        entityType: payload.entityType,
        kitchenId: payload.kitchenId,
        beneficiaryId: payload.beneficiaryId,
        relatedId: payload.relatedId,
        relatedType: payload.relatedType,
        extra: {
          jobId: payload.jobId,
          date: payload.date,
          progress: payload.progress,
          step: payload.step,
          result: payload.result,
          error: payload.error,
          status: payload.status,
        }
      },
      isRead: false,
    });
    await sendSseToChannel(channelKey, eventName, payload);

    console.log(
      `[NOTIFICATION] SSE sent to ${channelKey} | event: ${eventName}`
    );
  }
  catch (err) {
    console.error("[SSE SEND FAILED]", err);
  }
}

export async function setupConsumer(channel: Channel) {
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