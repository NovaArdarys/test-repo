import { CHANNEL_DELIVERY, CHANNEL_DRIVER_STATUS, redisSubscriber } from "@/services/public/redis.service.js";
import { broadcastToRoom } from "./rooms";

/**
 * Setup Redis listener untuk broadcast ke WebSocket room.
 * Semua pesan Redis channel akan diterjemahkan jadi broadcast ke room WS.
 */
export function setupRedisSubscriptions() {
  redisSubscriber.on("ready", () => console.log("[Redis] Subscriber ready ✅"));
  redisSubscriber.on("connect", () => console.log("[Redis] Connected to Redis"));
  redisSubscriber.on("subscribe", (ch, count) =>
    console.log(`[Redis] Subscribed to ${ch} (${count})`)
  );

  // ✅ Subscribe hanya sekali untuk dua channel
  redisSubscriber.subscribe(CHANNEL_DELIVERY, CHANNEL_DRIVER_STATUS, (err, count) => {
    if (err) {
      console.error("❌ Redis subscribe error:", err);
      return;
    }
    console.log(`✅ Subscribed to redis channels: ${CHANNEL_DELIVERY}, ${CHANNEL_DRIVER_STATUS}`);
  });

  // ✅ Satu listener tunggal
  redisSubscriber.on("message", (channel, message) => {
    let payload: any;

    try {
      payload = JSON.parse(message);
    } catch (err) {
      console.error("[Redis] Invalid JSON:", message);
      return;
    }

    // --- Normalized roomId & event name
    let roomId: string | undefined;
    let event: string;
    let data: any = payload.data ?? payload;

    if (payload.roomId) {
      // Jika payload sudah punya roomId langsung pakai
      roomId = payload.roomId;
      event = payload.event ?? "broadcast";
    } else if (channel === CHANNEL_DELIVERY && payload.deliveryId) {
      roomId = `delivery:${payload.deliveryId}`;
      event = payload.event ?? "location:update";
    } else if (channel === CHANNEL_DRIVER_STATUS && payload.driverId) {
      roomId = `driver:${payload.driverId}`;
      event = payload.event ?? "driver:status";
    } else {
      console.warn(`[Redis] Skipped unknown message on ${channel}`, payload);
      return;
    }

    console.log(`[Redis] Broadcast → room=${roomId} event=${event}`);
    broadcastToRoom(roomId || "", event, data);
  });
}
