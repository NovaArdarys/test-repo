import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema } from '@/validators/global.validator';
import {
  ListDeliveriesQuerySchema
} from '@/validators';

import {
  listDeliveriesHandler,
  getDeliveryByIdHandler
} from '@/controllers/public/web/delivery.controller';

const app = new Hono();
app.use(checkAccessToken);

app.get(
  '/',
  permission(),
  validate({ query: ListDeliveriesQuerySchema }),
  listDeliveriesHandler
);

app.get(
  '/:id',
  permission(),
  validate({ param: idParamSchema }),
  getDeliveryByIdHandler
);

export default app;