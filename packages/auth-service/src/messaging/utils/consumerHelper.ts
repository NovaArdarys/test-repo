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
      console.error("[// consumerHelper.ts
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
            const causeStr = err?.cause?.message?.toLowerCase() || "";

            // ============================================================
            // DUPLICATE / UNIQUE (Postgres + Drizzle)
            // ============================================================
            if (
              err?.code === "23505" ||                     // raw pg
              err?.cause?.code === "23505" ||              // drizzle wrapped
              err?.originalError?.code === "23505" ||      // failover
              msgStr.includes("duplicate key") ||          // message pattern
              causeStr.includes("duplicate key") ||
              msgStr.includes("unique constraint") ||
              causeStr.includes("unique constraint")
            ) {
              console.log("[SAFE CONSUME] Duplicate conflict — STOP RETRY");
              return channel.nack(msg, false, false); // ❗ STOP retry
            }

            // ============================================================
            // INVALID UUID
            // ============================================================
            if (
              msgStr.includes("invalid input syntax for type uuid") ||
              causeStr.includes("invalid input syntax for type uuid")
            ) {
              console.log("[SAFE CONSUME] Invalid UUID — STOP RETRY");
              return channel.nack(msg, false, false);
            }

            // ============================================================
            // BUSINESS ERROR
            // ============================================================
            if (err?.isBusinessError || err?.statusCode === 400) {
              console.log("[SAFE CONSUME] Business error — ACK");
              return channel.ack(msg);
            }

            // ============================================================
            // OTHER ERRORS → RETRY
            // ============================================================
            console.log("[SAFE CONSUME] Retrying...");
            return channel.nack(msg, false, true);
          }
        };
      }
]", err);;

      const msgText = msg.content.toString();
      console.error("[PAYLOAD]", msgText);

      const msgStr = err?.message?.toLowerCase() || "";
      const causeStr = err?.cause?.message?.toLowerCase() || "";

      // ============================================================
      // DUPLICATE / UNIQUE (Postgres + Drizzle)
      // ============================================================
      if (
        err?.code === "23505" ||                     // raw pg
        err?.cause?.code === "23505" ||              // drizzle wrapped
        err?.originalError?.code === "23505" ||      // failover
        msgStr.includes("duplicate key") ||          // message pattern
        causeStr.includes("duplicate key") ||
        msgStr.includes("unique constraint") ||
        causeStr.includes("unique constraint")
      ) {
        console.log("[SAFE CONSUME] Duplicate conflict — STOP RETRY");
        return channel.nack(msg, false, false); // ❗ STOP retry
      }

      // ============================================================
      // INVALID UUID
      // ============================================================
      if (
        msgStr.includes("invalid input syntax for type uuid") ||
        causeStr.includes("invalid input syntax for type uuid")
      ) {
        console.log("[SAFE CONSUME] Invalid UUID — STOP RETRY");
        return channel.nack(msg, false, false);
      }

      // ============================================================
      // BUSINESS ERROR
      // ============================================================
      if (err?.isBusinessError || err?.statusCode === 400) {
        console.log("[SAFE CONSUME] Business error — ACK");
        return channel.ack(msg);
      }

      // ============================================================
      // OTHER ERRORS → RETRY
      // ============================================================
      console.log("[SAFE CONSUME] Retrying...");
      return channel.nack(msg, false, true);
    }
  };
}
