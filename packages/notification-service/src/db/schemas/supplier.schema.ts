import { boolean, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { foodItems, menuPlans } from "./food.schema";
import { users } from "./user.schema";
import { storage } from "./storage.schema";

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  kitchenId: uuid('kitchen_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phoneNumber: text('phone_number'),
  address: text('address'),
  description: text('description'),
  storageId: uuid('storage_id').references(() => storage.id),
  imageURL: text('image_url'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by'),
});

export const suppliersFoodItems = pgTable('suppliers_food_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id'),
  foodItemId: uuid('food_item_id').notNull().references(() => foodItems.id),
  menuPlanId: uuid('menu_plan_id').notNull().references(() => menuPlans.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

export const suppliersProducts = pgTable('suppliers_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  foodItemId: uuid('food_item_id').notNull().references(() => foodItems.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
}, (table) => ({
  uniqueSupplierFoodItem: uniqueIndex("uq_supplier_fooditem").on(
    table.supplierId,
    table.foodItemId
  ),
}));