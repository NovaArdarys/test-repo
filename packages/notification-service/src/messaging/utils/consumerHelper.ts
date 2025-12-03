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
export function safeConsume<T extends Record<string, any>>(
  handler: (data: T, msg: ConsumeMessage, channel: Channel) => Promise<void> | void,
  channel: Channel
) {
  return async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const parsed = JSON.parse(msg.content.toString());
      const eventId = parsed._meta?.eventId;
      if (!eventId) return channel.nack(msg, false, false);

      const redisKey = `processed:${eventId}`;
      const alreadyProcessed = await redis.get(redisKey);
      if (alreadyProcessed) {
        console.log(`[SAFE CONSUME] Skip duplicate: ${eventId} - EXCHANGE: ${parsed?._meta?.exchange} - ROUTING KEY: ${parsed?._meta?.routingKey}`);
        return channel.ack(msg);
      }

      await handler(parsed, msg, channel);
      await redis.set(redisKey, "done", "EX", 60 * 60 * 24);

      await redis.hset(`eventlog:${eventId}`, {
        consumedBy: process.env.SERVICE_NAME || "kitchen_service",
        consumedAt: new Date().toISOString(),
        status: "consumed",
      });

      channel.ack(msg);
    } catch (err: any) {
      console.error("[SAFE CONSUME ERROR]", err);
      const msgText = msg.content.toString();
      console.error("[PAYLOAD]", msgText);

      const msgStr = err?.message?.toLowerCase() || "";

      // ============================================================
      // 1. UNIQUE / DUPLICATE (Postgres + Drizzle)
      // ============================================================
      const pgError = err.originalError || err.cause || err;

      if (
        pgError?.code === "23505" ||
        pgError?.detail?.includes("already exists") ||
        pgError?.message?.toLowerCase().includes("duplicate key") ||
        pgError?.constraint?.includes("unique")
      ) {
        console.log("[SAFE CONSUME] Duplicate/Conflict. STOP RETRY.");
        return channel.nack(msg, false, false);
      }

      // ============================================================
      // 2. INVALID INPUT (UUID error, cast error)
      // ============================================================
      if (
        msgStr.includes("invalid input syntax for type uuid") ||
        msgStr.includes("invalid input syntax") ||
        msgStr.includes("invalid uuid")
      ) {
        console.log("[SAFE CONSUME] Invalid input. STOP RETRY.");
        return channel.nack(msg, false, false);
      }

      // ============================================================
      // 3. NOT NULL CONSTRAINT (Drizzle or Postgres)
      // ============================================================
      if (
        msgStr.includes("null value in column") ||
        msgStr.includes("violates not-null constraint")
      ) {
        console.log("[SAFE CONSUME] NOT NULL violation. STOP RETRY.");
        return channel.nack(msg, false, false);
      }

      // ============================================================
      // 4. FOREIGN KEY CONSTRAINT
      // ============================================================
      if (
        msgStr.includes("violates foreign key constraint") ||
        msgStr.includes("foreign key")
      ) {
        console.log("[SAFE CONSUME] FK error. STOP RETRY.");
        return channel.nack(msg, false, false);
      }

      // ============================================================
      // 5. BUSINESS LOGIC ERROR (Custom)
      // ============================================================
      if (err?.isBusinessError || err?.statusCode === 400) {
        console.log("[SAFE CONSUME] Business error. ACK and skip.");
        return channel.ack(msg);
      }

      // ============================================================
      // 6. OTHER ERRORS → RETRY (network/timeout/db down)
      // ============================================================
      console.log("[SAFE CONSUME] Retrying message...");
      return channel.nack(msg, false, true);
    }

  };
}
