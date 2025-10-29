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
import { initializeConsumers } from './messaging/consumers';

type Variables = JwtVariables;


export const clients = new Set<WebSocket>();

const app = new Hono<{ Variables: Variables; }>()
  .use(logger())
  .use('/api', timeout(5000))
  .use(
    '/api/*',
    cors({
      origin: ['localhost', 'http://localhost:5173', 'http://128.199.77.145:3001', 'https://dev-mbg.midigi.id'], allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests', 'Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
      maxAge: 600,
      credentials: true,
    })
  )
  .use(
    '/auth/*',
    jwt({
      secret: 'it-is-very-secret',
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

      console.log(filePath);

      return filePath;
    }
  }))
  .get('/api/health', async (c) => {
    const dbStatus = await checkDatabase();
    const rabbitStatus = await checkBroker();

    return c.json({
      status: 'Running',
      service: 'Reporting Service',
      database: dbStatus,
      broker: rabbitStatus,
    });
  })
  .route('/api', routes)

  .onError(errorHandler);

async function bootstrap() {
  try {
    console.log("Starting application initialization...");

    const channel = await connectRabbitMQ();

    console.log("RabbitMQ connected and ready.");

    await initializeConsumers(channel);

    console.log("All RabbitMQ Consumers are successfully listening.");

  } catch (error) {
    console.error("🚨 FATAL ERROR: Application setup failed. Exiting...", error);
    process.exit(1);
  }
}

bootstrap();

export default {
  port: 3009,
  fetch: app.fetch,

};

export type AppType = typeof app;