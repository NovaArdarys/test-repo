import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';

import { BulkUpdateBeneficiarySchema } from '@/validator/beneficiary.validator';
import { bulkUpdateSchoolHandler } from '@/controllers/private/school.controller';

const app = new Hono();

app.patch(
  '/',
  validate(BulkUpdateBeneficiarySchema, 'body'),
  bulkUpdateSchoolHandler
);
export default app;