import { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
type SSEStream = {
  write: (payload: { event?: string; data: string; id?: string; }) => Promise<void>;
};

const clients: SSEStream[] = [];

export const sseController = (c: Context) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return streamSSE(c, async (stream) => {
    const sseClient: SSEStream = {
      write: (data) => stream.writeSSE(data),
    };
    clients.push(sseClient);

    await stream.writeSSE({ event: 'init', data: 'connected' });

    const heartbeat = setInterval(() => {
      void stream.writeSSE({ data: '💓' });
    }, 15000);

    c.req.raw.signal?.addEventListener('abort', () => {
      const i = clients.indexOf(sseClient);
      if (i !== -1) clients.splice(i, 1);
      clearInterval(heartbeat);
    });

    await new Promise(() => { });
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

// cara penggunaan

// await sendSseToAll('main', {
//       step: 'ProgramCreated', data: cleanedData, status: true, blockHash: event.block.hash
//     });