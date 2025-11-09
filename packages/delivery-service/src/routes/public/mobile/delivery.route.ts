import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import {
  listDeliveriesQuerySchema,
} from '@/validator/delivery.validator';

import {
  listDeliveriesHandler,
} from '@/controllers/public/delivery.controller';
import { entityTypeEnum } from '@/validator/globa.validator';
import z from 'zod';

const app = new Hono();
app.use(checkAccessToken);

app.get(
  '/:entity',
  validate({
    query: listDeliveriesQuerySchema, param: z.object({
      entity: entityTypeEnum
    })
  }),
  listDeliveriesHandler
);

export default app;