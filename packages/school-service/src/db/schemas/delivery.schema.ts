import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { deliverySchoolStatusEnum, deliveryStatusEnum } from "./enums/enums";

export const deliveries = pgTable('deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  kitchenId: uuid('kitchen_id').notNull(),
  driverId: uuid('driver_id').notNull(),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  estimatedDeliveryTime: timestamp('estimated_delivery_time'),
  notes: text('notes'),
  status: deliveryStatusEnum('status').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by'),
});

export const deliverySchools = pgTable('delivery_schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  deliveryId: uuid('delivery_id').notNull(),
  schoolId: uuid('school_id').notNull(),
  menuPlanId: uuid('menu_plan_id').notNull(),
  status: deliverySchoolStatusEnum('status').default('PENDING').notNull(),
  deliveredAt: timestamp('delivered_at'),
  notes: text('notes'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
});
