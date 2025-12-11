import { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
type SSEStream = {
  write: (payload: { event?: string; data: string; id?: string; }) => Promise<void>;
};

const clients: SSEStream[] = [];
const channels = new Map<string, Set<SSEStream>>();
export const sseController = (c: Context) => {
  const channelKey = c.req.query("channel");
  if (!channelKey) return c.text("Missing channel", 400);

  c.header("Access-Control-Allow-Origin", "*");
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache, no-transform");
  c.header("Connection", "keep-alive");

  const encoder = new TextEncoder();

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  if (!channels.has(channelKey)) channels.set(channelKey, new Set());

  const sseClient: SSEStream = {
    write: async ({ event, data, id }) => {
      const safe = JSON.stringify(data)
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");

      const msg =
        (event ? `event: ${event}\n` : "") +
        `data: ${safe}\n` +
        (id ? `id: ${id}\n` : "") +
        `\n`;

      await writer.write(encoder.encode(msg));
    },
  };

  channels.get(channelKey)!.add(sseClient);

  writer.write(encoder.encode("event: init\ndata: connected\n\n"));


  const heartbeat = setInterval(() => {
    writer.write(encoder.encode("data: 💓\n\n"));
  }, 15000);

  c.req.raw.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    channels.get(channelKey)?.delete(sseClient);
    writer.close();
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",

      "X-Accel-Buffering": "no",
      "Content-Encoding": "identity",
      "Keep-Alive": "timeout=600, max=1000",
      "Transfer-Encoding": "chunked",
    },
  });
};


export const sendSseToAll = async (event: string, data: unknown) => {
  for (const client of clients) {
    await client.write({
      data: JSON.stringify(data),
      event: event,
      id: String(Date.now()),
    });
  }
};

export const sendSseToChannel = async (channelKey: string, event: string, data: unknown) => {
  const group = channels.get(channelKey);
  console.log(group, "=====group=====");

  if (!group) return;

  for (const client of Array.from(group)) {
    try {
      await client.write({
        event,
        data: JSON.stringify(data),
        id: String(Date.now())
      });
    } catch (error) {
      console.log(error, "=====error===");

    }
  }
};
