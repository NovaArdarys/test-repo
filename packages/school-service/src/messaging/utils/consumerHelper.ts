// consumerHelper.ts
import { ConsumeMessage, Channel } from "amqplib";
import redis from "@/constants/redis";

/**
 * consumer helper
 *
 * @export
 * @template T
 * @param {((data: T, msg: ConsumeMessage, channel: Channel) => Promise<void> | void)} handler
 * @param {Channel} channel
 * @return {*} 
 */
const MAX_RETRY = 3;
export function safeConsume<T extends Record<string, any>>(
  handler: (data: T, msg: ConsumeMessage, channel: Channel) => Promise<void> | void,
  channel: Channel
) {
  return async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    let parsed: any;
    try {
      parsed = JSON.parse(msg.content.toString());
    } catch {
      console.log("[SAFE CONSUME] Invalid JSON. DROP.");
      return channel.nack(msg, false, false);
    }

    const eventId = parsed._meta?.eventId;
    if (!eventId) return channel.nack(msg, false, false);

    const processedKey = `processed:${eventId}`;
    const lockKey = `processing:${eventId}`;

    try {
      if (await redis.get(processedKey)) {
        console.log(`[SAFE CONSUME] Skip duplicate: ${eventId}`);
        return channel.ack(msg);
      }

      const locked = await redis.setnx(lockKey, "1");
      if (!locked) {
        console.log(`[SAFE CONSUME] Already processing: ${eventId}`);
        return channel.ack(msg);
      }

      await redis.expire(lockKey, 60);

      await handler(parsed, msg, channel);

      await redis.set(processedKey, "done", "EX", 60 * 60 * 24);

      await redis.del(lockKey);

      channel.ack(msg);
    } catch (err: any) {
      await redis.del(lockKey);

      const retryCount = getRetryCount(msg);

      if (retryCount >= MAX_RETRY) {
        console.log(`[SAFE CONSUME] Max retry reached. DROP.`);
        return channel.nack(msg, false, false);
      }

      console.log(`[SAFE CONSUME] Retry (${retryCount + 1}/${MAX_RETRY})`);
      return channel.nack(msg, false, false);
    }

  };
}

function getRetryCount(msg: ConsumeMessage): number {
  const deaths = (msg.properties.headers?.["x-death"] as any[]) || [];
  if (!Array.isArray(deaths)) return 0;

  return deaths.reduce((sum, d) => sum + (d.count || 0), 0);
}

export async function resetQueuesIfDev(
  channel: Channel,
  queues: string[]
) {
  if (process.env.NODE_ENV !== "DEVELOPMENT") {
    return;
  }

  console.log("[RABBITMQ] DEV MODE → Reset queues");

  for (const q of queues) {
    try {
      await channel.deleteQueue(q);
      console.log(`   Deleted queue: ${q}`);
    } catch (err: any) {
      if (err?.code === 404) {
        console.log(`  Queue not found (skip): ${q}`);
      } else {
        console.error(`  Failed deleting queue ${q}`, err);
      }
    }
  }
}

