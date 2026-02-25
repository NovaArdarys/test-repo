import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { permission } from '@/middleware/permission.middleware';
import { checkAccessToken } from '@/middleware/auth.middleware';

import { idParamSchema } from '@/validator/globa.validator';
import {
  createFoodItemSchema,
  updateFoodItemSchema,
  listFoodItemsQuerySchema,
  toggleAvailabilitySchema
} from '@/validator/food.item.validator';

import {
  listFoodItemsHandler,
  createFoodItemHandler,
  getFoodItemByIdHandler,
  updateFoodItemHandler,
  deleteFoodItemHandler,
  toggleFoodItemAvailabilityHandler,
  listMenuPlansByFoodItemIdHandler,
} from '@/controllers/public/food.item.controller';

const app = new Hono();

app.use(checkAccessToken);
app.get(
  '/',
  // permission(),
  validate(listFoodItemsQuerySchema, 'query'),
  listFoodItemsHandler
);

app.post(
  '/',
  // permission(),
  validate({ body: createFoodItemSchema }),
  createFoodItemHandler
);

app.get(
  '/:id/menus',
  // permission(),
  validate(idParamSchema, 'param'),
  listMenuPlansByFoodItemIdHandler
);


app.get(
  '/:id',
  // permission(),
  validate(idParamSchema, 'param'),
  getFoodItemByIdHandler
);

app.put(
  '/:id',
  // permission(),
  validate(idParamSchema, 'param'),
  validate({ body: updateFoodItemSchema }),
  updateFoodItemHandler
);

app.delete(
  '/:id',
  // permission(),
  validate(idParamSchema, 'param'),
  deleteFoodItemHandler
);

app.patch(
  '/:id/availability',
  // permission(),
  validate(idParamSchema, 'param'),
  validate({ body: toggleAvailabilitySchema }),
  toggleFoodItemAvailabilityHandler
);

export default app;