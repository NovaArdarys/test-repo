// publishHelper.ts
import redis from "@/constants/redis";
import { getRabbitMQChannel } from "../broker";

/**
 * safePublish - publish message ke RabbitMQ dengan confirm channel (ACK/NACK)
 * + Redis outbox untuk jaminan reliabilitas
 *
 * @param exchange - nama exchange RabbitMQ
 * @param routingKey - routing key (misal: "user.registered")
 * @param data - payload (akan di-stringify otomatis)
 */
export async function safePublish(exchange: string, routingKey: string, data: any) {
  const channel = getRabbitMQChannel();
  const message = JSON.stringify(data);

  const outboxKey = `outbox:${exchange}:${routingKey}:${Date.now()}`;
  await redis.set(outboxKey, message);

  await channel.assertExchange(exchange, "topic", { durable: true });

  return new Promise<void>((resolve, reject) => {
    channel.publish(exchange, routingKey, Buffer.from(message), { persistent: true }, async (err) => {
      if (err) {
        console.error(`[RABBITMQ] ❌ Failed to publish [${routingKey}]:`, err.message);
        return reject(err);
      }

      console.log(`[RABBITMQ] ✅ Published [${routingKey}] to ${exchange}`);

      await redis.del(outboxKey);

      resolve();
    });
  });
}
