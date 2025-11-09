import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
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
} from '@/controllers/public/mobile/school.classroom.controller';

const app = new Hono();

app.use(checkAccessToken);

app.get(
  '/',
  // permission(),
  validate({ query: ListSchoolClassroomQuerySchema }),
  listSchoolClassroomHandler
);

app.post(
  '/',
  // permission(),
  validate({ body: CreateSchoolClassroomSchema }),
  createSchoolClassroomHandler
);

app.get(
  '/:id',
  // permission(),
  validate({ param: idParamSchema }),
  getSchoolClassroomByIdHandler
);

app.put(
  '/:id',
  // permission(),
  validate({ body: CreateSchoolClassroomSchema, param: idParamSchema }),
  updateSchoolClassroomHandler
);

app.delete(
  '/:id',
  // permission(),
  validate({ param: idParamSchema }),
  deleteSchoolClassroomHandler
);

app.patch(
  '/bulk-update',
  // permission(),
  validate({ body: BulkUpdateTotalStudentSchema }),
  bulkUpdateTotalStudentsHandler
);

export default app;
