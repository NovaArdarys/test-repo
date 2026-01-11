import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema } from '@/validator/globa.validator';
import {
  createMenuSchema,
  updateMenuSchema,
  listMenusQuerySchema
} from '@/validator/menu.validator';

import {
  listMenusHandler,
  createMenuHandler,
  getMenuByIdHandler,
  updateMenuHandler,
  deleteMenuHandler
} from '@/controllers/public/web/menu.controller';

const app = new Hono();

app.use(checkAccessToken);
app.get(
  '/',
  permission(),
  validate(listMenusQuerySchema, 'query'),
  listMenusHandler
);

app.post(
  '/',
  permission(),
  validate(createMenuSchema),
  createMenuHandler
);

app.get(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  getMenuByIdHandler
);

app.put(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  validate(updateMenuSchema),
  updateMenuHandler
);

app.delete(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  deleteMenuHandler
);

export default app;