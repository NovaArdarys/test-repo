import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import {
  BulkRecordLocationSchema,
  ListDeliveriesQuerySchema,
  RecordLocationSchema,
  UpdateDeliveryStatusSchema,
} from '@/validators';

import { entityTypeEnum, idParamSchema } from '@/validators/global.validator';
import z from 'zod';
import { listDeliveriesHandler, updateDeliveryStatusHandler } from '@/controllers/public/mobile/delivery.controller';
import { createBulkLocationHandler, createSingleLocationHandler, listLocationsByDeliveryHandler } from '@/controllers/public/mobile/driver.location.controller';

const app = new Hono();
app.use(checkAccessToken);


app.get(
  '/:id/locations',
  validate({ param: idParamSchema }),
  listLocationsByDeliveryHandler
);

app.post(
  '/:id/locations',
  validate({ param: idParamSchema, }),
  validate({ body: RecordLocationSchema }),
  createSingleLocationHandler
);

app.post(
  '/:id/locations/bulk',
  validate({ param: idParamSchema, }),
  validate({ body: BulkRecordLocationSchema }),
  createBulkLocationHandler
);

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