// consumerHelper.ts
import { ConsumeMessage, Channel } from "amqplib";
import redis from "@/constants/redis";

const MAX_RETRY = 5;
const LOCK_TTL = 60; // seconds
const PROCESSED_TTL = 60 * 60 * 24; // 24 hours

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
    if (!eventId) {
      console.log("[SAFE CONSUME] No eventId. DROP.");
      return channel.nack(msg, false, false);
    }

    const processedKey = `processed:${eventId}`;
    const lockKey = `processing:${eventId}`;

    try {
      const alreadyProcessed = await redis.get(processedKey);
      if (alreadyProcessed) {
        console.log(`[SAFE CONSUME] Skip duplicate: ${eventId}`);
        return channel.ack(msg);
      }

      const locked = await redis.set(lockKey, "1", "EX", LOCK_TTL, "NX");

      if (locked !== "OK") {
        const lockTTL = await redis.ttl(lockKey);

        if (lockTTL === -1) {
          console.log(`[SAFE CONSUME] Orphaned lock detected, cleaning: ${eventId}`);
          await redis.del(lockKey);
          return channel.nack(msg, false, true); // requeue
        }

        if (lockTTL > 0) {
          console.log(`[SAFE CONSUME] Lock active (TTL: ${lockTTL}s), requeue: ${eventId}`);

          await new Promise(resolve => setTimeout(resolve, 1000));
          return channel.nack(msg, false, true); // requeue
        }

        return channel.nack(msg, false, true);
      }

      console.log(`[SAFE CONSUME] Processing: ${eventId}`);
      await handler(parsed, msg, channel);

      await redis.set(processedKey, "done", "EX", PROCESSED_TTL);

      await redis.del(lockKey);

      channel.ack(msg);
      console.log(`[SAFE CONSUME] ✅ Success: ${eventId}`);

    } catch (err: any) {
      console.error(`[SAFE CONSUME] Error processing ${eventId}:`, err.message);

      await redis.del(lockKey);

      const retryCount = getRetryCount(msg);
      if (retryCount >= MAX_RETRY) {
        console.error(
          `[SAFE CONSUME] Max retry reached (${retryCount}). ACK & DROP.`,
          { eventId, error: err.message }
        );
        channel.ack(msg);
        return;
      }

      console.log(`[SAFE CONSUME] Retry (${retryCount + 1}/${MAX_RETRY}): ${eventId}`);

      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 30000)));

      return channel.nack(msg, false, true); // requeue dengan requeue=true
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

  console.log("[RABBITMQ] DEV MODE → Reset queues and locks");

  const keys = await redis.keys("processing:*");
  const processedKeys = await redis.keys("processed:*");

  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`   Deleted ${keys.length} lock keys`);
  }

  if (processedKeys.length > 0) {
    await redis.del(...processedKeys);
    console.log(`   Deleted ${processedKeys.length} processed keys`);
  }

  for (const q of queues) {
    try {
      await channel.deleteQueue(q);
      console.log(`   Deleted queue: ${q}`);
    } catch (err: any) {
      if (err?.code === 404) {
        console.log(`   Queue not found (skip): ${q}`);
      } else {
        console.error(`   Failed deleting queue ${q}:`, err);
      }
    }
  }
}

export async function cleanRedisLocks() {
  const locks = await redis.keys("processing:*");
  const processed = await redis.keys("processed:*");

  if (locks.length > 0) await redis.del(...locks);
  if (processed.length > 0) await redis.del(...processed);

  console.log(`Cleaned ${locks.length} locks, ${processed.length} processed keys`);
}
