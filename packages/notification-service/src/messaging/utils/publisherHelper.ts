import redis from "@/constants/redis";
import { getRabbitMQChannel } from "../broker";
import { v4 as uuidv4 } from "uuid";

const OUTBOX_TTL = 60 * 5; // 5 menit

export async function safePublish(exchange: string, routingKey: string, data: any) {
  const channel = getRabbitMQChannel();

  const payload = {
    ...data,
    _meta: {
      eventId: uuidv4(),
      exchange,
      routingKey,
      createdAt: new Date().toISOString(),
    },
  };

  const message = JSON.stringify(payload);
  const outboxKey = `outbox:${exchange}:${routingKey}:${payload._meta.eventId}`;

  await redis.set(outboxKey, message, "EX", OUTBOX_TTL);

  await channel.assertExchange(exchange, "topic", { durable: true });

  await redis.hset(`eventlog:${payload._meta.eventId}`, {
    exchange,
    routingKey,
    publishedAt: new Date().toISOString(),
    status: "published",
    publisher: process.env.SERVICE_NAME || "unknown",
  });

  await redis.expire(`eventlog:${payload._meta.eventId}`, 60 * 60 * 24); // 24 jam

  return new Promise<void>((resolve, reject) => {
    channel.publish(
      exchange,
      routingKey,
      Buffer.from(message),
      { persistent: true },
      async (err) => {
        if (err) {
          console.error(`[RABBITMQ] ❌ Failed to publish [${routingKey}]:`, err.message);
          return reject(err);
        }

        console.log(`[RABBITMQ] ✅ Published [${routingKey}] (${payload._meta.eventId})`);

        await redis.del(outboxKey);
        resolve();
      }
    );
  });
}
