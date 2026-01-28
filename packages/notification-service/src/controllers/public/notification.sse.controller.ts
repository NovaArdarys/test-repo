import { Context } from 'hono';
import { streamSSE } from 'hono/streaming';

const channels = new Map<string, Set<any>>();

export const sseController = (c: Context) => {
  const channelKey = c.req.query("channel");
  if (!channelKey) return c.text("Missing channel", 400);

  c.header("Access-Control-Allow-Origin", "*");
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");
  c.header("X-Accel-Buffering", "no");

  return streamSSE(c, async (stream) => {
    if (!channels.has(channelKey)) {
      channels.set(channelKey, new Set());
    }

    const group = channels.get(channelKey)!;
    group.add(stream);

    console.log("[SSE CONNECT]", channelKey, "Total clients:", group.size);

    await stream.writeSSE({
      event: "init",
      data: "connected",
    });

    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({ data: ':heartbeat' });
      } catch (err) {
        console.error("[HEARTBEAT ERROR]", err);
        clearInterval(heartbeat);
        group.delete(stream);
      }
    }, 6000);

    await new Promise<void>((resolve) => {
      c.req.raw.signal.addEventListener('abort', () => {
        console.log("[SSE DISCONNECT]", channelKey, "Remaining:", group.size - 1);
        clearInterval(heartbeat);
        group.delete(stream);
        resolve();
      });
    });
  });
};

function safeEncode(data: unknown): string {
  if (typeof data === "string") {
    return data
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n")
      .replace(/\u0000/g, "")
      .replace(/[\u0001-\u001F]/g, "")
      .replace(/\u2028|\u2029/g, "");
  }

  let json = "";
  try {
    json = JSON.stringify(data);
  } catch (e) {
    json = String(data);
  }

  return json
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u001F]/g, "")
    .replace(/\u2028|\u2029/g, "");
}

export const sendSseToChannel = async (
  channelKey: string,
  event: string,
  data: unknown
) => {
  const group = channels.get(channelKey);

  if (!group || group.size === 0) {
    console.log(`[SSE] No clients for channel: ${channelKey}`);
    return;
  }

  console.log(`[SSE] Sending to ${group.size} clients on ${channelKey}`);

  const deadClients: any[] = [];

  for (const client of Array.from(group)) {
    try {
      const safeJson = safeEncode(data);

      await client.writeSSE({
        event,
        data: safeJson,
        id: String(Date.now()),
      });
    } catch (error) {
      console.error("[SSE SEND ERROR]", error);
      deadClients.push(client);
    }
  }

  deadClients.forEach((client) => group.delete(client));
};