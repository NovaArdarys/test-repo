import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware'; // Asumsi middleware validasi
import { permission } from '@/middleware/permission.middleware'; // Asumsi middleware permission// Skema Validasi

import { idParamSchema, paginationSchema } from '@/validator/global.validator';
import { CreateRoleSchema, UpdateRoleSchema } from '@/validator/role.permission.validator';
import { createRoleHandler, deleteRoleHandler, getRoleByIdHandler, listRolesHandler, updateRoleHandler } from '@/controllers/public/role.permission.management.controller';
import { checkAccessToken } from '@/middleware/auth.middleware';

const app = new Hono();

app.use(checkAccessToken)
  .get('/',
    permission(),
    validate(paginationSchema, 'query'),
    listRolesHandler
  )
  .post('/',
    permission(),
    validate(CreateRoleSchema),
    createRoleHandler
  )
  .get('/:id',
    permission(),
    validate(idParamSchema, 'param'),
    getRoleByIdHandler
  )
  .put('/:id',
    permission(),
    validate(idParamSchema, 'param'),
    validate(UpdateRoleSchema),
    updateRoleHandler
  )
  .delete('/:id',
    permission(),
    validate(idParamSchema, 'param'),
    deleteRoleHandler
  );

export default app;
