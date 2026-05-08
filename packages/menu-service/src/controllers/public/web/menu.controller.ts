import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  ListMenusQuerySchemaType,
  CreateMenuSchemaType,
  UpdateMenuSchemaType
} from "@/validator/menu.validator";
import { createMenu, getMenuById, getMenusList, softDeleteMenu, updateMenu } from "@/services/repositories/menu.food.service";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  domain: c.get('domain'),
  subDomain: c.get('subDomain'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date(),
  isAppManager: c.get("isAppManager") as boolean,
});



export const listMenusHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as ListMenusQuerySchemaType;

  const page = parseInt(String(query.page || '1'));
  const limit = parseInt(String(query.limit || '10'));

  const data = await getMenusList({
    page,
    limit,
  });

  return c.json({ data: data.data, meta: data.meta }, 200);
});

export const createMenuHandler = catchAsync(async (c: Context) => {
  const body = c.get('validatedData')?.body as CreateMenuSchemaType;
  const audit = getAuditFields(c);

  console.log(body, "=====body=====");

  const newMenu = await createMenu({
    ...body,
    createdBy: audit.createdBy,
  });

  return c.json({ data: newMenu, message: "Menu created" }, 201);
});

export const getMenuByIdHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();

  const menu = await getMenuById(id);

  return c.json({ data: menu }, 200);
});

export const updateMenuHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = c.get('validatedData')?.body as UpdateMenuSchemaType;
  const audit = getAuditFields(c);

  const updatedMenu = await updateMenu(id, {
    ...body,
    foodItemId: body.foodItemId!,
    menuFoodPlanId: body.menuFoodPlanId!,
  });

  return c.json({ data: updatedMenu, message: "Menu updated" }, 200);
});

export const deleteMenuHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const audit = getAuditFields(c);

  await softDeleteMenu(id, audit.updatedBy);

  return c.json({ message: "Menu deleted." }, 200);
});