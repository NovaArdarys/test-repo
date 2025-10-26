import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema } from '@/validator/globa.validator';
import { listDriversQuerySchema, createDriverSchema } from '@/validator/driver.validator';

import {
  listDriversHandler,
  createDriverHandler,
  getDriverByIdHandler,
  updateDriverHandler,
  deleteDriverHandler
} from '@/controllers/public/driver.controller';

const app = new Hono();

app.use(checkAccessToken);
app.get(
  '/',
  permission(),
  validate(listDriversQuerySchema, 'query'),
  listDriversHandler
);

app.post(
  '/',
  permission(),
  validate(createDriverSchema),
  createDriverHandler
);

app.get(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  getDriverByIdHandler
);

app.put(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  validate(createDriverSchema),
  updateDriverHandler
);

app.delete(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  deleteDriverHandler
);

export default app;