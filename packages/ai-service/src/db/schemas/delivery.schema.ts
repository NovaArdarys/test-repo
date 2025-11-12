import { boolean, date, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { deliveryBeneficiaryStatusEnum, deliveryStatusEnum } from "./enums/enums";

export const deliveries = pgTable('deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  kitchenId: uuid('kitchen_id').notNull(),
  driverId: uuid('driver_id').notNull(),
  deliveryDate: date('delivery_date').defaultNow(),
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
}, (table) => ({
  uniqKitchenDriverDate: uniqueIndex('uniq_kitchen_driver_date').on(
    table.kitchenId,
    table.driverId,
    table.deliveryDate
  ),
}));

export const deliveryBeneficiaries = pgTable('delivery_beneficiaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  deliveryId: uuid('delivery_id').notNull(),
  beneficiaryId: uuid('beneficiary_id').notNull(),
  menuPlanId: uuid('menu_plan_id').notNull(),
  status: deliveryBeneficiaryStatusEnum('status').default('PENDING').notNull(),
  deliveredAt: timestamp('delivered_at'),
  notes: text('notes'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
});
