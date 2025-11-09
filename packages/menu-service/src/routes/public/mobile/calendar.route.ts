import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import {
  listCalendar,
} from '@/controllers/public/mobile/calendar.controller';
import { listCalendarQuerySchema } from '@/validator/mobile/calendar.validator';
import { entityTypeEnum } from '@/validator/mobile/menu.plan.validator';
import z from 'zod';

const app = new Hono();

app.use(checkAccessToken);

app.get(
  '/:entity',
  validate({
    query: listCalendarQuerySchema, param: z.object({
      entity: entityTypeEnum
    }),
  }),
  listCalendar
);

export default app;