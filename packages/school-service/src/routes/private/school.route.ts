import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';

import { BulkUpdateSchoolSchema } from '@/validator/school.validator';
import { bulkUpdateSchoolHandler } from '@/controllers/private/school.controller';

const app = new Hono();

app.patch(
  '/',
  validate(BulkUpdateSchoolSchema, 'body'),
  bulkUpdateSchoolHandler
);
export default app;