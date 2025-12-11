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

      await writer.write(encoder.encode(`data: ${data}\n\n`));
    },
  };

  const heartbeat = setInterval(() => {
    writer.write(encoder.encode('data: {"msg":"ok"}\n\n'));
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

function safeEncode(data: unknown): string {
  // If already a string, keep it but sanitize
  if (typeof data === "string") {
    return data
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n")
      .replace(/\u0000/g, "")
      .replace(/[\u0001-\u001F]/g, "")
      .replace(/\u2028|\u2029/g, "");
  }

  // JSON stringify once, then sanitize
  let json = "";
  try {
    json = JSON.stringify(data);
  } catch (e) {
    // fallback to String() if circular / not serializable
    json = String(data);
  }

  return json
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u001F]/g, "")
    .replace(/\u2028|\u2029/g, "");
}



export const sendSseToAll = async (event: string, data: unknown) => {
  for (const client of clients) {
    const safeJson = safeEncode(data);

    await client.write({
      event,
      data: safeJson,
      id: String(Date.now()),
    });
  }
};


export const sendSseToChannel = async (channelKey: string, event: string, data: unknown) => {
  const group = channels.get(channelKey);
  console.log(data, group);
  if (!group) return;

  for (const client of Array.from(group)) {
    try {
      const safeJson = safeEncode(data);

      await client.write({
        event,
        data: safeJson,
        id: String(Date.now()),
      });
    } catch (error) {
      console.log("===== SSE SEND ERROR =====", error);
    }
  }
};

