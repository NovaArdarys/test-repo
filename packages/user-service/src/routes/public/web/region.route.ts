import { Hono } from 'hono'; // Asumsi middleware permission
import { checkAccessToken } from '@/middleware/auth.middleware'; // Asumsi middleware otentikasi

import {
  listProvincesHandler,
  listRegenciesHandler,
  listDistrictsHandler,
  listVillagesHandler
} from '@/controllers/public/region.controller';

const app = new Hono();

app.use(checkAccessToken);

app.get(
  '/provinces',
  listProvincesHandler
);

app.get(
  '/regencies',
  listRegenciesHandler
);

app.get(
  '/districts',
  listDistrictsHandler
);

app.get(
  '/villages',
  listVillagesHandler
);

export default app;