import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema } from '@/validator/globa.validator';
import {
  createMenuPlanSchema,
  updateMenuPlanSchema,
  listMenuPlansQuerySchema,
  updateMenuPlanStatusSchema,
  assignFoodToMenuPlanSchema,
  assignPlanDistributionSchema,
  unassignPlanDistributionQuerySchema,
  retryFailedMenuJobsSchema,
  fixBrokenMenuPlansSchema,
  overrideDriverSchema
} from '@/validator/menu.plan.validator';

import {
  listMenuPlansHandler,
  createMenuPlanHandler,
  getMenuPlanByIdHandler,
  updateMenuPlanHandler,
  deleteMenuPlanHandler,
  updateMenuPlanStatusHandler,
  // MenusFood Handlers
  listFoodItemsInPlanHandler,
  assignFoodToMenuPlanHandler,
  unassignFoodFromMenuPlanHandler,
  // Distribution Handlers
  listPlanDistributionHandler,
  assignPlanDistributionHandler,
  unassignPlanDistributionHandler,
  retryFailedMenuJobsHandler,
  fixBrokenMenuPlansHandler,
  resetMenuDataHandler,
  overrideDriverHandler
} from '@/controllers/public/web/menu.plan.controller';


import { 
  exportFoodWasteHandler,
  exportMenuPlansHandler 
} from '@/controllers/public/web/menu.export.controller';

const app = new Hono();

app.use(checkAccessToken);

app.post(
  '/retry-failed-jobs',
  validate({ body: retryFailedMenuJobsSchema }),
  retryFailedMenuJobsHandler
);

app.post(
  '/fix-broken-data',
  validate({ body: fixBrokenMenuPlansSchema }),
  fixBrokenMenuPlansHandler
);

app.post(
  '/reset-data',
  resetMenuDataHandler
);


// IMPORTANT: /export/food-waste must be before /:id
app.get('/export/food-waste', exportFoodWasteHandler);
app.get('/export', exportMenuPlansHandler);

app.get(
  '/',
  // permission(),
  validate(listMenuPlansQuerySchema, 'query'),
  listMenuPlansHandler
);

app.post(
  '/',
  // permission(),
  validate({ body: createMenuPlanSchema }),
  createMenuPlanHandler
);

app.get(
  '/:id',
  // permission(),
  validate(idParamSchema, 'param'),
  getMenuPlanByIdHandler
);

app.put(
  '/:id',
  // permission(),
  validate(idParamSchema, 'param'),
  validate(updateMenuPlanSchema),
  updateMenuPlanHandler
);

app.delete(
  '/:id',
  // permission(),
  validate(idParamSchema, 'param'),
  deleteMenuPlanHandler
);

app.patch(
  '/:id/status',
  // permission(),
  validate(idParamSchema, 'param'),
  validate(updateMenuPlanStatusSchema),
  updateMenuPlanStatusHandler
);

app.get(
  '/:id/food-items',
  // permission(),
  validate(idParamSchema, 'param'),
  listFoodItemsInPlanHandler
);

app.post(
  '/:id/food-items',
  // permission(),
  validate(idParamSchema, 'param'),
  validate(assignFoodToMenuPlanSchema),
  assignFoodToMenuPlanHandler
);

app.delete(
  '/:id/food-items/:foodItemId',
  // permission(),
  validate(idParamSchema, 'param'),
  unassignFoodFromMenuPlanHandler
);

app.get(
  '/:id/distribution',
  // permission(),
  validate(idParamSchema, 'param'),
  listPlanDistributionHandler
);

app.post(
  '/:id/distribution',
  // permission(),
  validate(idParamSchema, 'param'),
  validate(assignPlanDistributionSchema),
  assignPlanDistributionHandler
);

app.delete(
  '/:id/distribution',
  // permission(),
  validate(idParamSchema, 'param'),
  validate(unassignPlanDistributionQuerySchema, 'query'),
  unassignPlanDistributionHandler
);

app.put(
  '/:id/beneficiaries/:beneficiaryId/driver',
  validate(idParamSchema, 'param'),
  validate({ body: overrideDriverSchema }),
  overrideDriverHandler
);

export default app;