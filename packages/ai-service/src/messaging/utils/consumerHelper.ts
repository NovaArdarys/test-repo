import { ConsumeMessage, Channel } from "amqplib";
import redis from "@/constants/redis";

const MAX_RETRY = 5;
const LOCK_TTL = 60; // seconds
const PROCESSED_TTL = 60 * 60 * 24; // 24 hours

export function safeConsume<T extends Record<string, any>>(
  handler: (data: T, msg: ConsumeMessage, channel: Channel) => Promise<void> | void,
  channel: Channel,
  options?: { serviceName?: string; }
) {
  return async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    let parsed: any;
    try {
      parsed = JSON.parse(msg.content.toString());
    } catch (err) {
      console.log("[SAFE CONSUME] Invalid JSON. DROP.");
      return channel.nack(msg, false, false);
    }

    const eventId = parsed._meta?.eventId;
    if (!eventId) {
      console.log("[SAFE CONSUME] No eventId. DROP.");
      return channel.nack(msg, false, false);
    }

    const serviceName = options?.serviceName || 'default';
    const processedKey = `processed:${serviceName}:${eventId}`;
    const lockKey = `processing:${serviceName}:${eventId}`;

    try {
      const alreadyProcessed = await redis.get(processedKey);
      if (alreadyProcessed) {
        console.log(`[SAFE CONSUME] Skip duplicate: ${eventId}`);
        return channel.ack(msg);
      }

      const locked = await redis.setnx(lockKey, "1");

      if (!locked) {
        const lockTTL = await redis.ttl(lockKey);

        console.log(`[SAFE CONSUME] Lock check for ${eventId}: TTL=${lockTTL}`);

        if (lockTTL === -1) {
          console.log(`[SAFE CONSUME] ⚠️ Orphaned lock detected, cleaning: ${eventId}`);
          await redis.del(lockKey);
          await new Promise(resolve => setTimeout(resolve, 500));
          return channel.nack(msg, false, true); // requeue
        }

        if (lockTTL > 0 && lockTTL < LOCK_TTL) {
          console.log(`[SAFE CONSUME] ⏳ Lock active (TTL: ${lockTTL}s), requeue: ${eventId}`);

          await new Promise(resolve => setTimeout(resolve, 2000));
          return channel.nack(msg, false, true); // requeue
        }

        console.log(`[SAFE CONSUME] 🔄 Lock race condition, retry: ${eventId}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        return channel.nack(msg, false, true);
      }

      await redis.expire(lockKey, LOCK_TTL);

      console.log(`[SAFE CONSUME] 🔒 Lock acquired, processing: ${eventId}`);
      await handler(parsed, msg, channel);

      await redis.set(processedKey, "done", "EX", PROCESSED_TTL);

      await redis.del(lockKey);

      channel.ack(msg);
      console.log(`[SAFE CONSUME] ✅ Success: ${eventId}`);

    } catch (err: any) {
      console.error(`[SAFE CONSUME] ❌ Error processing ${eventId}:`, err.message);

      await redis.del(lockKey);

      const retryCount = getRetryCount(msg);
      if (retryCount >= MAX_RETRY) {
        console.error(
          `[SAFE CONSUME] 💀 Max retry reached (${retryCount}). ACK & DROP.`,
          { eventId, error: err.message }
        );
        channel.ack(msg); // DROP message
        return;
      }

      console.log(`[SAFE CONSUME] 🔄 Retry (${retryCount + 1}/${MAX_RETRY}): ${eventId}`);

      const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));

      return channel.nack(msg, false, true); // requeue
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

  console.log("[RABBITMQ] 🧹 DEV MODE → Reset queues and locks");

  // Hapus semua lock dan processed keys di development
  const lockKeys = await redis.keys("processing:*");
  const processedKeys = await redis.keys("processed:*");
  const outboxKeys = await redis.keys("outbox:*");

  if (lockKeys.length > 0) {
    await redis.del(...lockKeys);
    console.log(`   🗑️  Deleted ${lockKeys.length} lock keys`);
  }

  if (processedKeys.length > 0) {
    await redis.del(...processedKeys);
    console.log(`   🗑️  Deleted ${processedKeys.length} processed keys`);
  }

  if (outboxKeys.length > 0) {
    await redis.del(...outboxKeys);
    console.log(`   🗑️  Deleted ${outboxKeys.length} outbox keys`);
  }

  for (const q of queues) {
    try {
      await channel.deleteQueue(q);
      console.log(`   ✅ Deleted queue: ${q}`);
    } catch (err: any) {
      if (err?.code === 404) {
        console.log(`   ⚠️  Queue not found (skip): ${q}`);
      } else {
        console.error(`   ❌ Failed deleting queue ${q}:`, err);
      }
    }
  }
}

// Utility untuk manual clean (panggil saat startup di dev)
export async function cleanRedisLocksOnStartup() {
  if (process.env.NODE_ENV !== "DEVELOPMENT") {
    return;
  }

  console.log("[REDIS] 🧹 Cleaning stale locks on startup...");

  const lockKeys = await redis.keys("processing:*");
  const processedKeys = await redis.keys("processed:*");

  if (lockKeys.length > 0) {
    await redis.del(...lockKeys);
    console.log(`[REDIS] 🗑️  Cleaned ${lockKeys.length} stale locks`);
  }

  if (processedKeys.length > 0) {
    await redis.del(...processedKeys);
    console.log(`[REDIS] 🗑️  Cleaned ${processedKeys.length} processed keys`);
  }
}