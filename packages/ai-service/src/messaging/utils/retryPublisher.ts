import redis from "@/constants/redis";
import { getRabbitMQChannel } from "../broker";

export async function retryOutboxPublishes() {
  const channel = getRabbitMQChannel();
  const keys = await redis.keys("outbox:*");

  if (keys.length === 0) {
    console.log("[OUTBOX] No pending messages.");
    return;
  }

  for (const key of keys) {
    const data = await redis.get(key);
    if (!data) continue;

    const [, exchange, routingKey] = key.split(":");

    try {
      await channel.assertExchange(exchange, "topic", { durable: true });

      channel.publish(exchange, routingKey, Buffer.from(data), { persistent: true }, async (err) => {
        if (err) {
          console.warn(`[OUTBOX RETRY] ❌ Failed to re-publish ${key}:`, err.message);
        } else {
          console.log(`[OUTBOX RETRY] ✅ Successfully re-published ${key}`);
          await redis.del(key);
        }
      });
    } catch (err) {
      console.error("[OUTBOX RETRY ERROR]", err);
    }
  }
}
