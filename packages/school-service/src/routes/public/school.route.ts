import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema, userIdParamSchema } from '@/validator/global.validator';
import { CreateBeneficiarySchema, AssignUserToBeneficiarySchema, ListBeneficiaryQuerySchema } from '@/validator/beneficiary.validator';

import {
  listBeneficiaryHandler,
  createBeneficiaryHandler,
  getBeneficiaryByIdHandler,
  updateBeneficiaryHandler,
  deleteBeneficiaryHandler,
  assignUserToBeneficiaryHandler,
  unassignUserFromBeneficiaryHandler
} from '@/controllers/public/school.controller';

const app = new Hono();

app.use(checkAccessToken);

app.get(
  '/',
  permission(),
  validate({ query: ListBeneficiaryQuerySchema }),
  listBeneficiaryHandler
);

app.post(
  '/',
  permission(),
  validate({ body: CreateBeneficiarySchema }),
  createBeneficiaryHandler
);

app.get(
  '/:id',
  permission(),
  validate({ param: idParamSchema }),
  getBeneficiaryByIdHandler
);

app.put(
  '/:id',
  permission(),
  validate({ param: idParamSchema, body: CreateBeneficiarySchema }),
  updateBeneficiaryHandler
);

app.delete(
  '/:id',
  permission(),
  validate({ param: idParamSchema }),
  deleteBeneficiaryHandler
);

app.post(
  '/:id/users',
  permission(),
  validate({ param: idParamSchema, body: AssignUserToBeneficiarySchema }),
  assignUserToBeneficiaryHandler
);

app.delete(
  '/:id/users/:userId',
  permission(),
  validate({ param: idParamSchema.merge(userIdParamSchema) }),
  unassignUserFromBeneficiaryHandler
);

export default app;