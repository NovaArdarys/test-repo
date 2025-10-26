import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema } from '@/validator/globa.validator';
import {
  listDeliveriesQuerySchema,
  createDeliverySchema,
  updateDeliverySchema,
  updateDeliveryStatusSchema,
  assignSchoolSchema
} from '@/validator/delivery.validator';

import {
  listDeliveriesHandler,
  createDeliveryHandler,
  getDeliveryByIdHandler,
  updateDeliveryHandler,
  softDeleteDeliveryHandler,
  updateDeliveryStatusHandler,
  listSchoolsByDeliveryIdHandler,
  assignSchoolToDeliveryHandler,
  unassignSchoolFromDeliveryHandler
} from '@/controllers/public/delivery.controller';
import { listDeliveryLocationsHandler } from '@/controllers/public/driver.location.controller';

const app = new Hono();
app.use(checkAccessToken);

app.get(
  '/',
  permission(),
  validate(listDeliveriesQuerySchema, 'query'),
  listDeliveriesHandler
);

app.post(
  '/',
  permission(),
  validate(createDeliverySchema),
  createDeliveryHandler
);

app.get(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  getDeliveryByIdHandler
);

app.put(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  validate(updateDeliverySchema),
  updateDeliveryHandler
);

app.delete(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  softDeleteDeliveryHandler
);

app.patch(
  '/:id/status',
  permission(),
  validate(idParamSchema, 'param'),
  validate(updateDeliveryStatusSchema),
  updateDeliveryStatusHandler
);

app.get(
  '/:id/schools',
  permission(),
  validate(idParamSchema, 'param'),
  listSchoolsByDeliveryIdHandler
);

app.post(
  '/:id/schools',
  permission(),
  validate(idParamSchema, 'param'),
  validate(assignSchoolSchema),
  assignSchoolToDeliveryHandler
);

app.delete(
  '/:id/schools/:schoolId',
  permission(),
  validate(idParamSchema, 'param'),
  unassignSchoolFromDeliveryHandler
);

app.get(
  '/:id/locations',
  permission(),
  validate(idParamSchema, 'param'),
  listDeliveryLocationsHandler
);

export default app;