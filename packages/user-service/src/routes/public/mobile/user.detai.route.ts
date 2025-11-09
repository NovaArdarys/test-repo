import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware'; // Asumsi middleware validasi
import {

  updateUserDetailsHandler,
  getUserProfile
} from '@/controllers/public/user.management.controller';
import { userDetailSchema } from '@/validator/user.validator';
import { checkAccessToken } from '@/middleware/auth.middleware';

const app = new Hono();

app.use(checkAccessToken)
  .get('/profile',
    getUserProfile
  )
  .put('/profile',
    validate({ body: userDetailSchema }),
    updateUserDetailsHandler
  );

export default app;