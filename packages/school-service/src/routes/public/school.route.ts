import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema, userIdParamSchema } from '@/validator/globa.validator';
import { createSchoolSchema, assignUserToSchoolSchema, listSchoolsQuerySchema } from '@/validator/school.validator';

import {
  listSchoolsHandler,
  createSchoolHandler,
  getSchoolByIdHandler,
  updateSchoolHandler,
  deleteSchoolHandler,
  assignUserToSchoolHandler,
  unassignUserFromSchoolHandler
} from '@/controllers/public/school.controller';

const app = new Hono();

app.use(checkAccessToken);

app.get(
  '/',
  permission(),
  validate(listSchoolsQuerySchema, 'query'),
  listSchoolsHandler
);

app.post(
  '/',
  permission(),
  validate(createSchoolSchema),
  createSchoolHandler
);

app.get(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  getSchoolByIdHandler
);

app.put(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  validate(createSchoolSchema),
  updateSchoolHandler
);

app.delete(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  deleteSchoolHandler
);

app.post(
  '/:id/users',
  permission(),
  validate(idParamSchema, 'param'),
  validate(assignUserToSchoolSchema),
  assignUserToSchoolHandler
);

app.delete(
  '/:id/users/:userId',
  permission(),
  validate(idParamSchema, 'param'),
  validate(userIdParamSchema, 'param'),
  unassignUserFromSchoolHandler
);

export default app;