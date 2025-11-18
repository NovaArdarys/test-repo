// consumerHelper.ts
import { ConsumeMessage, Channel } from "amqplib";
import { redisShared } from "@/constants/redis";

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
      const alreadyProcessed = await redisShared.get(redisKey);
      if (alreadyProcessed) {
        console.log(`[SAFE CONSUME] Skip duplicate: ${eventId} - EXCHANGE: ${parsed?._meta?.exchange} - ROUTING KEY: ${parsed?._meta?.routingKey}`);
        return channel.ack(msg);
      }

      await handler(parsed, msg, channel);
      await redisShared.set(redisKey, "done", "EX", 60 * 60 * 24);

      await redisShared.hset(`eventlog:${eventId}`, {
        consumedBy: process.env.SERVICE_NAME || "kitchen_service",
        consumedAt: new Date().toISOString(),
        status: "consumed",
      });

      channel.ack(msg);
    } catch (err) {
      console.error("[SAFE CONSUME ERROR]", err);
      channel.nack(msg, false, true);
    }
  };
}
