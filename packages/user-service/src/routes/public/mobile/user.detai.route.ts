import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware'; // Asumsi middleware validasi
import {

  updateUserDetailsHandler,
  getUserProfile
} from '@/controllers/public/user.management.controller';
import { userDetailSchema } from '@/validator/user.validator';
import { checkAccessToken } from '@/middleware/auth.middleware';
import z from 'zod';

const app = new Hono();

app.use(checkAccessToken)
  .get('/profile',
    validate({
      query: z.object()
    }),
    getUserProfile
  )
  .put('/profile',
    validate({ body: userDetailSchema }),
    updateUserDetailsHandler
  );

export default app;