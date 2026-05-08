process.env.TZ = 'Asia/Jakarta';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import { jwt } from 'hono/jwt';
import type { JwtVariables } from 'hono/jwt';
import routes from './routes/public/web';
import routesMobile from './routes/public/mobile';
import { errorHandler } from '@/middleware/error.middleware';
import { join } from 'path';
import { checkBroker, connectRabbitMQ } from './messaging/broker';
import { checkDatabase } from '@/db';
import monitor from './routes/monitor';
import { swaggerUI } from '@hono/swagger-ui';
import { initializeConsumers } from './messaging/consumers';

// ─── App Type ────────────────────────────────────────────────────────────────
type Variables = JwtVariables;

export const clients = new Set<WebSocket>();

/**
 * Allowed CORS origins — keep in sync with auth-service/src/constants/config.ts.
 * TODO: extract to a shared workspace constant once a packages/shared module exists.
 */
const ALLOWED_ORIGINS = [
  'localhost',
  'https://sip-mbg.bappenas.go.id',
  'http://localhost:5173',
  'http://128.199.77.145:3001',
  'https://dev-mbg.midigi.id',
];

// ─── App Instance ─────────────────────────────────────────────────────────────
const app = new Hono<{ Variables: Variables; }>()
  .use(logger())
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

  // ─── JWT Guard (legacy fallback, HS256) ────────────────────────────────────
  // NOTE: See auth-service/src/index.ts for rationale.
  .use(
    '/auth/*',
    jwt({
      secret: process.env.JWT_FALLBACK_SECRET || 'it-is-very-secret',
      alg: 'HS256',
    })
  )

  // ─── Static file serving ───────────────────────────────────────────────────
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
    },
  }))

  // ─── Swagger UI ─────────────────────────────────────────────────────────────
  .get('/swagger/mobile', swaggerUI({
    url: process.env.NODE_ENV === 'DEVELOPMENT'
      ? '/api/mobile/openapi.json'
      : '/menu/api/mobile/openapi.json',
  }))
  .get('/swagger', swaggerUI({ url: '/menu/api/openapi.json' }))

  // ─── Health check ───────────────────────────────────────────────────────────
  .get('/api/health', async (c) => {
    const dbStatus = await checkDatabase();
    const rabbitStatus = await checkBroker();

    return c.json({
      status: 'Running',
      service: 'Menu Service',
      database: dbStatus,
      broker: rabbitStatus,
    });
  })

  // ─── Routes ─────────────────────────────────────────────────────────────────
  .route('/api/monitor', monitor)
  .route('/api', routes)
  .route('/api/mobile', routesMobile)

  .onError(errorHandler);

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    console.log('Starting application initialization...');

    const channel = await connectRabbitMQ();

    console.log('RabbitMQ connected and ready.');

    await initializeConsumers(channel);

    console.log('All RabbitMQ Consumers are successfully listening.');
  } catch (error) {
    console.error('🚨 FATAL ERROR: Application setup failed. Exiting...', error);
    process.exit(1);
  }
}

bootstrap();

// ─── Export ─────────────────────────────────────────────────────────────────
export default {
  port: 3007,
  fetch: app.fetch,
};

export type AppType = typeof app;