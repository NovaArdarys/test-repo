import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema } from '@/validator/globa.validator';
import {
  entityTypeEnum,
  listMenuPlansQuerySchema,
} from '@/validator/mobile/menu.plan.validator';

import {
  listMenuPlansHandler,
  getMenuPlanByIdHandler,
} from '@/controllers/public/mobile/menu.plan.controller';
import z from 'zod';

const app = new Hono();

app.use(checkAccessToken);

app.get(
  '/:entity',
  validate({
    query: listMenuPlansQuerySchema, param: z.object({
      entity: entityTypeEnum
    }),
  }),
  listMenuPlansHandler
);

app.get(
  '/:id',
  validate(idParamSchema, 'param'),
  getMenuPlanByIdHandler
);

export default app;