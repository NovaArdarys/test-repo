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
  validate({ query: listFoodItemsQuerySchema }),
  listFoodItemsHandler
);


export default app;