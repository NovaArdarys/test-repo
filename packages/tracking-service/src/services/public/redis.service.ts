import redis from '@/constants/redis';

export const redisSubscriber = redis.duplicate();

export const CHANNEL_DELIVERY = 'tracking:delivery:location';
export const CHANNEL_DRIVER_STATUS = 'tracking:driver:status';

export function broadcastToRoom(
  roomMap: Map<string, Set<WebSocket>>,
  roomId: string,
  event: string,
  data: any
) {
  const clients = roomMap.get(roomId);
  if (clients) {
    const payload = JSON.stringify({ event, data });
    Array.from(clients).forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
  }
}