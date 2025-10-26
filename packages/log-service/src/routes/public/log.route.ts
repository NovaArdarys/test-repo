import { Hono } from 'hono';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import {
  listAppLogsHandler,
  listTokenLogsHandler,
} from '@/controllers/public/log.controller';

const app = new Hono();

app.use(checkAccessToken);
app.get(
  '/app',
  // permission(),
  listAppLogsHandler
);

app.get(
  '/token',
  // permission(),
  listTokenLogsHandler
);
export default app;