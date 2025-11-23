import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import {
  ListDeliveriesQuerySchema,
  UpdateDeliveryStatusSchema,
} from '@/validator/delivery.validator';

import { entityTypeEnum, idParamSchema } from '@/validator/globa.validator';
import z from 'zod';
import { listDeliveriesHandler, updateDeliveryStatusHandler } from '@/controllers/public/mobile/delivery.controller';

const app = new Hono();
app.use(checkAccessToken);

app.get(
  '/:entity',
  validate({
    query: ListDeliveriesQuerySchema,
    param: z.object({
      entity: entityTypeEnum
    })
  }),
  listDeliveriesHandler
);

app.put(
  '/:id/status',
  validate({ body: UpdateDeliveryStatusSchema, param: idParamSchema }),
  updateDeliveryStatusHandler
);

export default app;