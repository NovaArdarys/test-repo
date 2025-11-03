import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware'; // Asumsi middleware validasi
import { permission } from '@/middleware/permission.middleware'; // Asumsi middleware permission // Skema Validasi
import {
  listUsersHandler, createUserHandler, getUserByIdHandler, updateUserHandler, deleteUserHandler,
  getUserDetailsHandler, updateUserDetailsHandler,
  getUserProfile
} from '@/controllers/public/user.management.controller';
import { userListQuerySchema } from '@/validator/role.permission.validator';
import { createUserSchema, updateUserSchema, userDetailSchema } from '@/validator/user.validator';
import { idParamSchema } from '@/validator/globa.validator';
import { checkAccessToken } from '@/middleware/auth.middleware';

const app = new Hono();

app.use(checkAccessToken)
  .get('/',
    permission(),
    validate(userListQuerySchema, 'query'),
    listUsersHandler
  )
  .get('/profile',
    getUserProfile
  )
  .put('/profile',
    validate(userDetailSchema),
    updateUserDetailsHandler
  )
  .post('/',
    permission(),
    validate(createUserSchema),
    createUserHandler
  )
  .get('/:id',
    permission(),
    validate(idParamSchema, 'param'),
    getUserByIdHandler
  )
  .put('/:id',
    permission(),
    validate(idParamSchema, 'param'),
    validate(updateUserSchema),
    updateUserHandler
  )
  .delete('/:id',
    permission(),
    validate(idParamSchema, 'param'),
    deleteUserHandler
  )
  .get('/:id/details',
    permission(),
    validate(idParamSchema, 'param'),
    getUserDetailsHandler
  )
  .put('/:id/details',
    permission(),
    validate(idParamSchema, 'param'),
    validate(userDetailSchema),
    updateUserDetailsHandler
  );

export default app;