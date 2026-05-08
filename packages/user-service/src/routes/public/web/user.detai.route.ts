import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import {
  listUsersHandler, createUserHandler, getUserByIdHandler, updateUserHandler, deleteUserHandler,
  getUserProfile,
  updateUserDetailsHandler
} from '@/controllers/public/user.management.controller';
import { exportUsersHandler } from '@/controllers/public/user.export.controller';
import { UserListQuerySchema } from '@/validator/role.permission.validator';
import { createUserSchema, registerSchema, userDetailSchema } from '@/validator/user.validator';
import { idParamSchema } from '@/validator/global.validator';
import { checkAccessToken } from '@/middleware/auth.middleware';

const app = new Hono();

app.use(checkAccessToken)
  .get('/',
    // permission(),
    validate(UserListQuerySchema, 'query'),
    listUsersHandler
  )
  .get('/profile',
    getUserProfile
  )
  .put('/profile',
    validate(userDetailSchema),
    updateUserDetailsHandler
  )
  // IMPORTANT: /export must be BEFORE /:id to avoid param capture
  .get('/export',
    exportUsersHandler
  )
  .get('/:id',
    validate(idParamSchema, 'param'),
    getUserByIdHandler
  )
  .put('/:id',
    // permission(),
    validate({ param: idParamSchema }),
    validate({ body: registerSchema }),
    updateUserHandler
  )
  .delete('/:id',
    // permission(),
    validate(idParamSchema, 'param'),
    deleteUserHandler
  );

export default app;