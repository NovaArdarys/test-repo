import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware'; // Asumsi middleware validasi
import { permission } from '@/middleware/permission.middleware'; // Asumsi middleware permission // Skema Validasi
import {
  listUsersHandler, createUserHandler, getUserByIdHandler, updateUserHandler, deleteUserHandler,
  getUserProfile,
  updateUserDetailsHandler
} from '@/controllers/public/user.management.controller';
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
  .get('/:id',
    validate(idParamSchema, 'param'),
    getUserByIdHandler
  )
  .put('/:id',
    // permission(),
    validate({ body: registerSchema, param: idParamSchema }),
    updateUserHandler
  )
  .delete('/:id',
    // permission(),
    validate(idParamSchema, 'param'),
    deleteUserHandler
  );

export default app;