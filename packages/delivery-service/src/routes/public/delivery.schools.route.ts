import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema } from '@/validator/globa.validator';
import { updateDeliverySchoolStatusSchema } from '@/validator/delivery.validator';

import {
  listDeliverySchoolsHandler,
  createDeliverySchoolHandler,
  getDeliverySchoolByIdHandler,
  updateDeliverySchoolHandler,
  softDeleteDeliverySchoolHandler,
  updateDeliverySchoolStatusHandler
} from '@/controllers/public/delivery.school.controller';

const app = new Hono();

app.use(checkAccessToken);
app.get(
  '/',
  permission(),
  listDeliverySchoolsHandler
);

app.post(
  '/',
  permission(),
  createDeliverySchoolHandler
);

app.get(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  getDeliverySchoolByIdHandler
);

app.put(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  updateDeliverySchoolHandler
);

app.delete(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  softDeleteDeliverySchoolHandler
);


app.patch(
  '/:id/status',
  permission(),
  validate(idParamSchema, 'param'),
  validate(updateDeliverySchoolStatusSchema),
  updateDeliverySchoolStatusHandler
);

export default app;