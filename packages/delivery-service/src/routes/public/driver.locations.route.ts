import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { recordLocationSchema } from '@/validator/delivery.validator';

import {
  recordDriverLocationHandler
} from '@/controllers/public/driver.location.controller';

const app = new Hono();
app.use(checkAccessToken);

app.post(
  '/',
  permission(),
  validate(recordLocationSchema),
  recordDriverLocationHandler
);

export default app;