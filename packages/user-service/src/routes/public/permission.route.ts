import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware'; // Asumsi middleware validasi
import { permission } from '@/middleware/permission.middleware'; // Asumsi middleware permission// Skema Validasi

import { idParamSchema, paginationSchema } from '@/validator/globa.validator';
import { createPermissionSchema, createRoleSchema, permissionListQuerySchema, updatePermissionSchema, updateRoleSchema } from '@/validator/role.permission.validator';
import { createPermissionHandler, deletePermissionHandler, getPermissionByIdHandler, listPermissionsHandler, updatePermissionHandler } from '@/controllers/public/role.permission.management.controller';
import { checkAccessToken } from '@/middleware/auth.middleware';

const app = new Hono();

app.use(checkAccessToken)
  .get('/',
    permission(),
    validate(permissionListQuerySchema, 'query'),
    listPermissionsHandler
  )
  .post('/',
    permission(),
    validate(createPermissionSchema),
    createPermissionHandler
  )
  .get('/:id',
    permission(),
    validate(idParamSchema, 'param'),
    getPermissionByIdHandler
  )
  .put('/:id',
    permission(),
    validate(idParamSchema, 'param'),
    validate(updatePermissionSchema),
    updatePermissionHandler
  )
  .delete('/:id',
    permission(),
    validate(idParamSchema, 'param'),
    deletePermissionHandler
  );

export default app;
