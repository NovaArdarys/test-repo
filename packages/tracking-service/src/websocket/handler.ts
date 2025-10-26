import { verifyToken } from '@/utils/jwt';
import { joinRoom, leaveAllRooms } from './rooms';
import redis from '@/constants/redis';
import { ServerWebSocket, WebSocketHandler } from 'bun';

type WebSocketData = { userId: string; };

export const handleUpgrade = ((): WebSocketHandler => {

  return {
    open(ws: ServerWebSocket<undefined>) {
      const fullUrl = (ws.data as any)?.url;
      if (!fullUrl) {
        console.error('[WS open] Missing URL context');
        ws.close(4000, 'Missing URL context');
        return;
      }

      const url = new URL(fullUrl, 'http://localhost');
      const initialRoom = url.searchParams.get('room');

      if (initialRoom) {
        joinRoom(initialRoom, ws as any);
        console.log(`[WS] joined ${initialRoom}`);
      }
    },

    async message(ws: ServerWebSocket<undefined>, message: any) {
      try {
        let text: string;

        if (typeof message === "string") {
          text = message;
        } else if (message instanceof ArrayBuffer) {
          text = new TextDecoder().decode(message);
        } else if (message instanceof Uint8Array) {
          text = new TextDecoder().decode(message);
        } else {
          console.warn("[WS message] Unknown message type:", typeof message, message);
          return;
        }

        console.log(text, "-----raw message-----");

        const msg = JSON.parse(text) as {
          action: "subscribe" | "unsubscribe" | "publish" | "join";
          room?: string;
          channel?: string;
          payload?: any;
        };

        switch (msg.action) {
          case "subscribe":
            if (msg.room) joinRoom(msg.room, ws as any);
            break;

          case "unsubscribe":
            if (msg.room) {
              const roomMap = (globalThis as any).__roomMap as Map<string, Set<ServerWebSocket<WebSocketData>>>;
              const roomSet = roomMap?.get(msg.room);
              if (roomSet) roomSet.delete(ws as any);
            }
            break;

          case "publish":
            if (msg.channel && msg.payload) {
              try {
                await redis.publish(msg.channel, JSON.stringify(msg.payload));
                console.log(`[WS publish] sent to channel ${msg.channel}`);
              } catch (e) {
                console.error("[Redis publish error]", e);
                ws.send(JSON.stringify({ error: "Failed to publish message" }));
              }
            }
            break;
          case "join":
            if (msg.room) {
              const roomId = msg.channel ? `${msg.channel}:${msg.room}` : msg.room;
              joinRoom(roomId, ws as any);
              console.log(`[WS join] ${roomId}`);
              ws.send(JSON.stringify({ event: "joined", roomId }));
            } else {
              ws.send(JSON.stringify({ error: "Missing room" }));
            }
            break;

          default:
            console.warn("[WS unknown action]", msg);
        }
      } catch (e) {
        console.error("[WS message error]", e);
        ws.send(JSON.stringify({ error: "Invalid message format" }));
      }
    },

    close(ws: ServerWebSocket<undefined>, message: any | string,) {
      console.log(`[WS closed] code=${message.code} reason=${message.reason}`);
      leaveAllRooms(ws as any);
    },
  };
});