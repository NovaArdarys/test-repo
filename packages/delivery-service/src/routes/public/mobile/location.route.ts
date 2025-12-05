import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import {
  RecordLocationSchema,
  BulkRecordLocationSchema,
} from '@/validator/delivery.validator';

import {
  createSingleLocationHandler,
  createBulkLocationHandler,
} from '@/controllers/public/mobile/driver.location.controller';

const app = new Hono();
app.use(checkAccessToken);
app.post(
  '/',
  validate({ body: RecordLocationSchema }),
  createSingleLocationHandler
);

app.post(
  '/bulk',
  validate({ body: BulkRecordLocationSchema }),
  createBulkLocationHandler
);

export default app;
