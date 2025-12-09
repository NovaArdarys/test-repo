import { foodTypeEnum, planStatusEnum } from "./enums/enums";
import { boolean, date, jsonb, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { kitchens } from "./kitchen.schema";
import { sql } from "drizzle-orm";

export const foodItems = pgTable('food_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  nameEn: varchar('name_en', { length: 100 }),
  type: foodTypeEnum('type').notNull(),
  description: text('description'),
  descriptionEn: text('description_en'),
  isAvailable: boolean('is_available').default(true).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by'),
  ingredients: jsonb('ingredients')
    .$type<{ name: string; nameEn: string; }[] | null>()
    .default(sql`'[]'::jsonb`)
    .notNull(),
});

export const menuFoodItem = pgTable('menu_food_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  foodItemId: uuid('food_item_id').notNull(),
  menuFoodPlanId: uuid('menu_food_plan_id').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
});

export const menuPlans = pgTable('menu_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  kitchenId: uuid('kitchen_id').references(() => kitchens.id),
  name: text('name'),
  planStartDate: date('plan_start_date').notNull(),
  planEndDate: date('plan_end_date').notNull(),
  villageId: uuid('village_id'),
  status: planStatusEnum('status').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by'),
}, (table) => {
  return {
    kitchenDateUnique: unique('kitchen_date_unique')
      .on(table.kitchenId, table.planStartDate),
  };
});

export const menuPlanBeneficiaries = pgTable('menu_plan_beneficiaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuPlanId: uuid('menu_plan_id').notNull(),
  beneficiaryId: uuid('beneficiary_id').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
});