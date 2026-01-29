import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema, userIdParamSchema, createKitchenSchema, assignUserToKitchenSchema, listKitchensQuerySchema } from '@/validator';

import {
  listKitchensHandler,
  createKitchenHandler,
  getKitchenByIdHandler,
  updateKitchenHandler,
  deleteKitchenHandler,
  assignUserToKitchenHandler,
  unassignUserFromKitchenHandler
} from '@/controllers/public/web/kitchen.controller';

const app = new Hono();

app.use(checkAccessToken);
app.get(
  '/',
  // permission(),
  validate(listKitchensQuerySchema, 'query'),
  listKitchensHandler
);

app.post(
  '/',
  // permission(),
  validate(createKitchenSchema),
  createKitchenHandler
);

app.get(
  '/:id',
  // permission(),
  validate(idParamSchema, 'param'),
  getKitchenByIdHandler
);

app.put(
  '/:id',
  // permission(),
  validate(idParamSchema, 'param'),
  validate(createKitchenSchema),
  updateKitchenHandler
);

app.delete(
  '/:id',
  // permission(),
  validate(idParamSchema, 'param'),
  deleteKitchenHandler
);

app.post(
  '/:id/users',
  // permission(),
  validate(idParamSchema, 'param'),
  validate(assignUserToKitchenSchema),
  assignUserToKitchenHandler
);

app.delete(
  '/:id/users/:userId',
  // permission(),
  validate(idParamSchema, 'param'),
  validate(userIdParamSchema, 'param'),
  unassignUserFromKitchenHandler
);

export default app;