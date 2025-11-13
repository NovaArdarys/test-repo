import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware'; // Asumsi middleware validasi
import { permission } from '@/middleware/permission.middleware'; // Asumsi middleware permission// Skema Validasi

import { idParamSchema, paginationSchema } from '@/validator/global.validator';
import { CreatePermissionSchema, PermissionListQuerySchema, UpdatePermissionSchema } from '@/validator/role.permission.validator';
import { createPermissionHandler, deletePermissionHandler, getPermissionByIdHandler, listPermissionsHandler, updatePermissionHandler } from '@/controllers/public/role.permission.management.controller';
import { checkAccessToken } from '@/middleware/auth.middleware';

const app = new Hono();

app.use(checkAccessToken)
  .get('/',
    permission(),
    validate(PermissionListQuerySchema, 'query'),
    listPermissionsHandler
  )
  .post('/',
    permission(),
    validate(CreatePermissionSchema),
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
    validate(UpdatePermissionSchema),
    updatePermissionHandler
  )
  .delete('/:id',
    permission(),
    validate(idParamSchema, 'param'),
    deletePermissionHandler
  );

export default app;
