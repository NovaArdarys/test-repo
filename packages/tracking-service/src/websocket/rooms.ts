import { ServerWebSocket } from "bun";

export type WebSocketData = { userId?: string; };

if (!(globalThis as any).__ROOM_MAP__) {
  (globalThis as any).__ROOM_MAP__ = new Map<
    string,
    Set<ServerWebSocket<WebSocketData>>
  >();
}

export const roomMap = (globalThis as any)
  .__ROOM_MAP__ as Map<string, Set<ServerWebSocket<WebSocketData>>>;

const userRoomMap = new Map<string, string>();

export function joinRoom(
  roomId: string,
  sock: ServerWebSocket<WebSocketData>,
  leaveOthers = true
) {
  if (!roomId) {
    console.warn("[joinRoom] roomId kosong, abaikan");
    return;
  }

  if (leaveOthers) leaveAllRooms(sock);

  let room = roomMap.get(roomId);
  if (!room) {
    room = new Set();
    roomMap.set(roomId, room);
  }

  room.add(sock);

  if (sock.data?.userId) {
    userRoomMap.set(sock.data.userId, roomId);
  }

  console.log(`[joinRoom] ${sock.data?.userId ?? "(anon)"} joined ${roomId}`);
  console.log(`[rooms] Total clients in ${roomId}: ${room.size}`);
}

export function leaveAllRooms(sock: ServerWebSocket<WebSocketData>) {
  for (const [roomId, members] of Array.from(roomMap.entries())) {
    if (members.has(sock)) {
      members.delete(sock);
      if (members.size === 0) roomMap.delete(roomId);
    }
  }
}

export function broadcastToRoom(roomId: string, event: string, data: any) {
  const clients = roomMap.get(roomId);

  if (!clients || clients.size === 0) {
    console.log(`[broadcast] Room ${roomId} tidak ditemukan atau kosong`);
    return;
  }

  const payload = JSON.stringify({ event, data });
  console.log(`[broadcast] Sending to ${clients.size} clients in ${roomId}`);

  for (const client of Array.from(clients)) {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    } catch (err) {
      console.warn(`[broadcast] Failed to send to client`, err);
    }
  }
}
