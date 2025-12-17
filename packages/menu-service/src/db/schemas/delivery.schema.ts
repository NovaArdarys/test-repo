import { boolean, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { deliveryBeneficiaryStatusEnum, deliveryStatusEnum } from "./enums/enums";
import { masterSteps } from "./stepPlan.schema";
import { users } from "./user.schema";

export const deliveries = pgTable('deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  kitchenId: uuid('kitchen_id').notNull(),
  driverId: uuid('driver_id'),
  deliveryDate: date('delivery_date').defaultNow(),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  estimatedDeliveryTime: timestamp('estimated_delivery_time'),
  notes: text('notes'),
  deliveryCode: text('delivery_code'),
  status: deliveryStatusEnum('status').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by'),
  portionType: text("portion_type").default("DEFAULT"),
  targetPortion: integer("target_portion").default(0).notNull(),
  receivedPortion: integer("received_portion").default(0).notNull(),
  takenTray: integer("taken_tray").default(0).notNull(),
  type: text("type").default("DROPOFF").notNull(),
}, (table) => ({
  // uniqKitchenDriverDate: uniqueIndex('uniq_kitchen_driver_date').on(
  //   table.kitchenId,
  //   table.driverId,
  //   table.deliveryDate,
  //   table.portionType
  // ),
}));

export const deliveryBeneficiaries = pgTable('delivery_beneficiaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  deliveryId: uuid('delivery_id').notNull(),
  beneficiaryId: uuid('beneficiary_id').notNull(),
  menuPlanId: uuid('menu_plan_id').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
});

export const deliveryStepReports = pgTable(
  "delivery_step_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    deliveryBeneficiaryId: uuid("delivery_beneficiary_id")
      .notNull()
      .references(() => deliveryBeneficiaries.id, {
        onDelete: "cascade",
      }),

    stepId: uuid("step_id")
      .notNull()
      .references(() => masterSteps.id, {
        onDelete: "restrict",
      }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),
  },
  (table) => ({
    byDeliveryBeneficiary: index(
      "idx_delivery_step_reports_delivery_beneficiary"
    ).on(table.deliveryBeneficiaryId),
    uniqDeliveryStep: uniqueIndex("uniq_delivery_step").on(
      table.deliveryBeneficiaryId,
      table.stepId
    ),
  })
);