import Redis from "ioredis";
import { sendSseToChannel } from "../controllers/public/notification.sse.controller";

const redisSubscriber = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: 6379,
  password: process.env.REDIS_PASSWORD || "password",
});

export const setupRedisSubscriber = async () => {
  redisSubscriber.on("connect", () => {
    console.log("✅ Redis Subscriber connected");
  });

  redisSubscriber.on("error", (err) => {
    console.error("❌ Redis Subscriber error", err);
  });

  await redisSubscriber.subscribe("delivery_tracking");

  redisSubscriber.on("message", async (channel, message) => {
    if (channel === "delivery_tracking") {
      try {
        const data = JSON.parse(message);
        const deliveryId = data.deliveryId;

        if (deliveryId) {
          // Broadcast to SSE clients in channel 'delivery_{id}'
          await sendSseToChannel(`delivery_${deliveryId}`, "location_update", data);
        }
      } catch (err) {
        console.error("❌ Error processing Redis message:", err);
      }
    }
  });
};
