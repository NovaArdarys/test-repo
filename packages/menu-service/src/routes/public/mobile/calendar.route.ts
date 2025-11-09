import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import {
  listCalendar,
} from '@/controllers/public/mobile/calendar.controller';
import { listCalendarQuerySchema } from '@/validator/calendar.validator';

const app = new Hono();

app.use(checkAccessToken);

app.get(
  '/',
  validate({ query: listCalendarQuerySchema }),
  listCalendar
);

export default app;