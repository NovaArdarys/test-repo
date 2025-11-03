import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema } from '@/validator/globa.validator';
import {
  CreateSchoolClassroomSchema,
  ListSchoolClassroomQuerySchema,
  BulkUpdateTotalStudentSchema
} from '@/validator/school.classroom.validator';

import {
  listSchoolClassroomHandler,
  createSchoolClassroomHandler,
  getSchoolClassroomByIdHandler,
  updateSchoolClassroomHandler,
  deleteSchoolClassroomHandler,
  bulkUpdateTotalStudentsHandler
} from '@/controllers/public/school.classroom.controller';

const app = new Hono();

app.use(checkAccessToken);

app.get(
  '/',
  permission(),
  validate(ListSchoolClassroomQuerySchema, 'query'),
  listSchoolClassroomHandler
);

app.post(
  '/',
  permission(),
  validate(CreateSchoolClassroomSchema),
  createSchoolClassroomHandler
);

app.get(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  getSchoolClassroomByIdHandler
);

app.put(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  validate(CreateSchoolClassroomSchema),
  updateSchoolClassroomHandler
);

app.delete(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  deleteSchoolClassroomHandler
);

app.patch(
  '/bulk-update',
  permission(),
  validate(BulkUpdateTotalStudentSchema),
  bulkUpdateTotalStudentsHandler
);

export default app;
