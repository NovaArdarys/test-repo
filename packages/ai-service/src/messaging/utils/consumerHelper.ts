import { ConsumeMessage, Channel } from "amqplib";
import redis from "@/constants/redis";

const MAX_RETRY = 5;
const LOCK_TTL = 60; // seconds
const PROCESSED_TTL = 60 * 60 * 24; // 24 jam — cukup lama untuk idempotency

export function safeConsume<T extends Record<string, any>>(
  handler: (data: T, msg: ConsumeMessage, channel: Channel) => Promise<void> | void,
  channel: Channel,
  options?: {
    serviceName?: string;
    /**
     * Custom idempotency key dari payload.
     * Default: _meta.eventId
     *
     * Gunakan ini kalau publisher bisa kirim eventId berbeda
     * untuk event yang "sama secara bisnis", contoh:
     *   getIdempotencyKey: (data) => `${data.entityId}:${data.menuPlanId}`
     */
    getIdempotencyKey?: (data: T) => string | null | undefined;
  }
) {
  return async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    let parsed: T;
    try {
      parsed = JSON.parse(msg.content.toString());
    } catch {
      console.log("[SAFE CONSUME] Invalid JSON. DROP.");
      return channel.nack(msg, false, false);
    }

    let idempotencyKey: string | null | undefined;

    if (options?.getIdempotencyKey) {
      idempotencyKey = options.getIdempotencyKey(parsed);
    } else {
      idempotencyKey = (parsed as any)._meta?.eventId;
    }

    if (!idempotencyKey) {
      console.log("[SAFE CONSUME] No idempotency key. DROP.");
      return channel.nack(msg, false, false);
    }

    const serviceName = options?.serviceName || "default";
    const processedKey = `processed:${serviceName}:${idempotencyKey}`;
    const lockKey = `processing:${serviceName}:${idempotencyKey}`;

    console.log(`[SAFE CONSUME] 📩 Incoming | key=${idempotencyKey} | service=${serviceName}`);

    try {
      const alreadyProcessed = await redis.get(processedKey);
      if (alreadyProcessed) {
        console.log(`[SAFE CONSUME] ⏭️  Skip duplicate: ${idempotencyKey}`);
        return channel.ack(msg);
      }

      const locked = await redis.set(lockKey, "1", "EX", LOCK_TTL, "NX");

      if (!locked) {
        const lockTTL = await redis.ttl(lockKey);
        console.log(`[SAFE CONSUME] 🔒 Already locked (TTL: ${lockTTL}s), requeue: ${idempotencyKey}`);

        if (lockTTL === -1) {
          console.log(`[SAFE CONSUME] ⚠️  Orphaned lock, cleaning: ${idempotencyKey}`);
          await redis.del(lockKey);
          await new Promise(r => setTimeout(r, 300));
          return channel.nack(msg, false, true);
        }

        await new Promise(r => setTimeout(r, 1000));
        return channel.nack(msg, false, true);
      }

      console.log(`[SAFE CONSUME] 🔓 Lock acquired, processing: ${idempotencyKey}`);

      await handler(parsed, msg, channel);

      await redis.set(processedKey, "1", "EX", PROCESSED_TTL);
      await redis.del(lockKey);
      channel.ack(msg);

      console.log(`[SAFE CONSUME] ✅ Done: ${idempotencyKey}`);

    } catch (err: any) {
      console.error(`[SAFE CONSUME] ❌ Error processing ${idempotencyKey}:`, err.message);

      await redis.del(lockKey);

      const retryCount = getRetryCount(msg);

      if (retryCount >= MAX_RETRY) {
        console.error(`[SAFE CONSUME] 💀 Max retry reached (${retryCount}). DROP: ${idempotencyKey}`);
        return channel.ack(msg);
      }

      const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
      console.log(`[SAFE CONSUME] 🔄 Retry ${retryCount + 1}/${MAX_RETRY} in ${backoffMs}ms: ${idempotencyKey}`);
      await new Promise(r => setTimeout(r, backoffMs));
      return channel.nack(msg, false, true);
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
  return;
  if (process.env.NODE_ENV !== "DEVELOPMENT") return;

  console.log("[RABBITMQ] 🧹 DEV MODE → Reset queues and locks");

  const [lockKeys, processedKeys, outboxKeys] = await Promise.all([
    redis.keys("processing:*"),
    redis.keys("processed:*"),
    redis.keys("outbox:*"),
  ]);

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

export async function cleanRedisLocksOnStartup() {
  if (process.env.NODE_ENV !== "DEVELOPMENT") return;

  console.log("[REDIS] 🧹 Cleaning stale locks on startup...");

  const [lockKeys, processedKeys] = await Promise.all([
    redis.keys("processing:*"),
    redis.keys("processed:*"),
  ]);

  if (lockKeys.length > 0) {
    await redis.del(...lockKeys);
    console.log(`[REDIS] 🗑️  Cleaned ${lockKeys.length} stale locks`);
  }
  if (processedKeys.length > 0) {
    await redis.del(...processedKeys);
    console.log(`[REDIS] 🗑️  Cleaned ${processedKeys.length} processed keys`);
  }
}