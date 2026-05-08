process.env.TZ = 'Asia/Jakarta';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import { jwt } from 'hono/jwt';
import type { JwtVariables } from 'hono/jwt';
import routes from './routes';
import { errorHandler } from '@/middleware/error.middleware';
import { join } from 'path';
import { checkBroker } from './messaging/broker';
import { checkDatabase } from '@/db';
import { eventMonitorRoute } from './routes/event.monitor.route';
import { swaggerUI } from '@hono/swagger-ui';
import { ALLOWED_ORIGINS } from '@/constants/config';
import { bootstrap } from './bootstrap';

// ─── App Type ────────────────────────────────────────────────────────────────
type Variables = JwtVariables;

export const clients = new Set<WebSocket>();

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
  // NOTE: This middleware guards /auth/* with a hardcoded HS256 secret.
  // The real authentication flow uses RS256 key-pair verification via the
  // checkAccessToken middleware in individual route handlers, so this guard
  // is effectively unused for authenticated API routes. It is kept in place
  // to preserve backward compatibility with any client expecting a 401 on
  // /auth/* without a bearer token. Replace with a proper env-sourced secret
  // or remove once confirmed unused.
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
  .get('/swagger', swaggerUI({ url: '/auth/api/openapi.json' }))

  // ─── Health check ───────────────────────────────────────────────────────────
  .get('/api/health', async (c) => {
    const dbStatus = await checkDatabase();
    const rabbitStatus = await checkBroker();

    return c.json({
      status: 'Running',
      service: 'Auth Service',
      database: dbStatus,
      broker: rabbitStatus,
    });
  })

  // ─── Routes ─────────────────────────────────────────────────────────────────
  .route('/api/events', eventMonitorRoute)
  .route('/api', routes)

  .onError(errorHandler);

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
bootstrap();

// ─── Export ─────────────────────────────────────────────────────────────────
export default {
  port: 3000,
  fetch: app.fetch,
};

export type AppType = typeof app;