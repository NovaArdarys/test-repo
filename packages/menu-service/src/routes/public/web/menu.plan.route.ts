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
  unassignPlanDistributionHandler
} from '@/controllers/public/web/menu.plan.controller';

const app = new Hono();

app.use(checkAccessToken);

app.get(
  '/',
  permission(),
  validate(listMenuPlansQuerySchema, 'query'),
  listMenuPlansHandler
);

app.post(
  '/',
  permission(),
  validate({ body: createMenuPlanSchema }),
  createMenuPlanHandler
);

app.get(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  getMenuPlanByIdHandler
);

app.put(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  validate(updateMenuPlanSchema),
  updateMenuPlanHandler
);

app.delete(
  '/:id',
  permission(),
  validate(idParamSchema, 'param'),
  deleteMenuPlanHandler
);

app.patch(
  '/:id/status',
  permission(),
  validate(idParamSchema, 'param'),
  validate(updateMenuPlanStatusSchema),
  updateMenuPlanStatusHandler
);

app.get(
  '/:id/food-items',
  permission(),
  validate(idParamSchema, 'param'),
  listFoodItemsInPlanHandler
);

app.post(
  '/:id/food-items',
  permission(),
  validate(idParamSchema, 'param'),
  validate(assignFoodToMenuPlanSchema),
  assignFoodToMenuPlanHandler
);

app.delete(
  '/:id/food-items/:foodItemId',
  permission(),
  validate(idParamSchema, 'param'),
  unassignFoodFromMenuPlanHandler
);

app.get(
  '/:id/distribution',
  permission(),
  validate(idParamSchema, 'param'),
  listPlanDistributionHandler
);

app.post(
  '/:id/distribution',
  permission(),
  validate(idParamSchema, 'param'),
  validate(assignPlanDistributionSchema),
  assignPlanDistributionHandler
);

app.delete(
  '/:id/distribution',
  permission(),
  validate(idParamSchema, 'param'),
  validate(unassignPlanDistributionQuerySchema, 'query'),
  unassignPlanDistributionHandler
);

export default app;