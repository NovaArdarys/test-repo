import { z } from "zod";
import { Channel } from "amqplib";
import { EXCHANGES } from "../events/exchanges";
import { resetQueuesIfDev, safeConsume } from "../utils/consumerHelper";
import { aiStatusSchema } from "@/validator/aiStatus.validator";
import { sendSseToChannel } from "@/controllers/public/notification.controller";

const AI_STATUS_QUEUE = "ai_status_notification_queue";
const AI_STATUS_ROUTING_KEY = "ai.status.#";

async function handleAiStatusEvent(data: unknown) {
  const parsed = aiStatusSchema.parse(data);

  const eventName = `ai:${parsed.status.toLowerCase()}`;

  console.log(parsed.channel, eventName, parsed, "======parsed.channel, eventName, parsed======");

  await sendSseToChannel(parsed.channel, eventName, parsed,);

  console.log(`[NOTIFICATION] SSE sent to ${parsed.channel}: ${eventName}`);
}

export async function setupConsumer(channel: Channel) {
  await resetQueuesIfDev(channel, [
    AI_STATUS_QUEUE,
    `${AI_STATUS_QUEUE}.retry`,
  ]);
  const RETRY_EXCHANGE = `${EXCHANGES.AI}.retry`;

  await channel.assertExchange(EXCHANGES.AI, "topic", { durable: true });
  await channel.assertExchange(RETRY_EXCHANGE, "topic", { durable: true });

  const queue = await channel.assertQueue(AI_STATUS_QUEUE, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": RETRY_EXCHANGE,
    },
  });

  await channel.assertQueue(`${AI_STATUS_QUEUE}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000, // 5s retry delay
      "x-dead-letter-exchange": EXCHANGES.AI,
    },
  });

  await channel.bindQueue(
    queue.queue,
    EXCHANGES.AI,
    AI_STATUS_ROUTING_KEY
  );

  await channel.bindQueue(
    `${AI_STATUS_QUEUE}.retry`,
    RETRY_EXCHANGE,
    AI_STATUS_ROUTING_KEY
  );

  channel.prefetch(20);

  channel.consume(
    queue.queue,
    safeConsume(handleAiStatusEvent, channel),
    { noAck: false }
  );

  console.log(
    `[*] Notification Service listening for AI status events in ${queue.queue}`
  );
}
