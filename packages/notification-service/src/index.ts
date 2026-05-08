process.env.TZ = 'Asia/Jakarta';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import { jwt } from 'hono/jwt';
import type { JwtVariables } from 'hono/jwt';
import routes from './routes/public';
import { errorHandler } from '@/middleware/error.middleware';
import { join } from 'path';
import { checkBroker, connectRabbitMQ } from './messaging/broker';
import { checkDatabase } from '@/db';
import { eventMonitorRoute } from './routes/event.monitor.route';
import { swaggerUI } from '@hono/swagger-ui';
import { initializeConsumers } from './messaging/consumers';
import { sseController } from './controllers/public/notification.sse.controller';
import { setupRedisSubscriber } from './messaging/redis.subscriber';
import { ALLOWED_ORIGINS } from '@/constants/config';

// ─── App Type ────────────────────────────────────────────────────────────────
type Variables = JwtVariables;


export const clients = new Set<WebSocket>();

const app = new Hono<{ Variables: Variables; }>();
app.get("/notifications/sse", sseController);

app.use("/api/*", logger())
  .use('/api', timeout(5000))
  // CORS 
  .use(
    '/api/*',
    cors({
      origin: ALLOWED_ORIGINS,
      allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests', 'Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
      maxAge: 600,
      credentials: true,
    })
  )
  //JWT Guard (legacy fallback, HS256)
  .use(
    '/auth/*',
    jwt({
      secret: process.env.JWT_FALLBACK_SECRET || 'it-is-very-secret',
      alg: 'HS256',
    })
  )
  .use('/public/*', async (c) => {
    const publicPath = join(process.cwd(), 'public');

    const filePath = join(publicPath, c.req.path.replace('/public/', ''));
    const file = Bun.file(filePath);
    return new Response(file);
  })

  .use('/file-data/*', serveStatic({
    root: './public',
    rewriteRequestPath: (path) => {

      const filePath = path.replace('/file-data/', '');
      return filePath;
    }
  }))
  .get('/swagger', swaggerUI({ url: '/api/openapi.json' })).get('/api/health', async (c) => {
    const dbStatus = await checkDatabase();
    const rabbitStatus = await checkBroker();

    return c.json({
      status: 'Running',
      service: 'Notification Service',
      database: dbStatus,
      broker: rabbitStatus,
    });
  })
  .route("/api/events", eventMonitorRoute)
  .route('/api', routes)

  .onError(errorHandler);

async function bootstrap() {
  try {
    console.log("Starting application initialization...");

    const channel = await connectRabbitMQ();

    console.log("RabbitMQ connected and ready.");

    await initializeConsumers(channel);

    console.log("All RabbitMQ Consumers are successfully listening.");

    await setupRedisSubscriber();
    console.log("Redis Subscriber for Live Tracking is active.");

  } catch (error) {
    console.error("🚨 FATAL ERROR: Application setup failed. Exiting...", error);
    process.exit(1);
  }
}

bootstrap();

export default {
  port: 3008,
  fetch: app.fetch,

};

export type AppType = typeof app;