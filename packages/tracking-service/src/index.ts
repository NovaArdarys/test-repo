import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import { jwt } from 'hono/jwt';
import type { JwtVariables } from 'hono/jwt';
import { join } from 'path';
import { errorHandler } from '@/middleware/error.middleware';
import { checkDatabase } from '@/db';
import { setupRedisSubscriptions } from './websocket/broadcaster';
import { httpPublishHandler } from './websocket/publish';
import { checkBroker } from './messaging/broker';
import type { ServerWebSocket } from 'bun';
import { handleUpgrade } from './websocket/handler';
import { eventMonitorRoute } from './routes/event.monitor.route';

type Variables = JwtVariables;
export const clients = new Set<ServerWebSocket<unknown>>();

const app = new Hono<{ Variables: Variables; }>();

app
  .use(logger())
  .use('/api', timeout(5000))
  .use(
    '/api/*',
    cors({
      origin: ['localhost', 'http://localhost:5173', 'http://128.199.77.145:3001', 'https://dev-mbg.midigi.id'], allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests', 'Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
      credentials: true,
      maxAge: 600,
    }),
  )
  .use(
    '/auth/*',
    jwt({
      secret: 'it-is-very-secret',
      alg: 'HS256',
    }),
  )
  .use('/public/*', async (c) => {
    const publicPath = join(process.cwd(), 'public');
    const filePath = join(publicPath, c.req.path.replace('/public/', ''));
    return new Response(Bun.file(filePath));
  })
  .use(
    '/file-data/*',
    serveStatic({
      root: './public',
      rewriteRequestPath: (path) => {
        const filePath = path.replace('/file-data/', '');
        console.log('[serveStatic]', filePath);
        return filePath;
      },
    }),
  )
  .get('/api/health', async (c) => {
    const dbStatus = await checkDatabase();
    const rabbitStatus = await checkBroker();

    return c.json({
      status: 'Running',
      service: 'Tracking Service',
      database: dbStatus,
      broker: rabbitStatus,
    });
  })
  .route("/api/events", eventMonitorRoute);
  .onError(errorHandler);

const port = Number(3002);

(async () => {

  Bun.serve({
    port,
    websocket: handleUpgrade(),
    async fetch(req, server) {
      const url = new URL(req.url);

      if (url.pathname === '/ws') {
        if (server.upgrade(req, { data: { url: req?.url || "" } } as any)) {
          return;
        }
        return new Response('Upgrade failed', { status: 400 });
      }

      if (url.pathname === '/publish' && req.method === 'POST') {
        return httpPublishHandler(req);
      }

      return app.fetch(req, server);
    },
  });

  try {
    // await redis.connect();
    // await redisSubscriber.connect();
    setupRedisSubscriptions();
    console.log('✅ Redis connected');
  } catch (e) {
    console.error('❌ Failed to connect Redis:', e);
    process.exit(1);
  }


  console.log(`✅ tracking-service running on port ${port}`);
})();
