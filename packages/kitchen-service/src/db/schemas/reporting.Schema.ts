import {
  boolean,
  date,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./user.schema";
import { masterSteps } from "./stepPlan.schema";
import { entityTypeEnum } from "./enums/enums";
import { menuPlans } from "./food.schema";
import { storage } from "./storage.schema";

export const dailyReports = pgTable(
  "daily_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    entityType: entityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    menuPlanId: uuid("menu_plan_id")
      .notNull()
      .references(() => menuPlans.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status").default("draft").notNull(),
  },
  (table) => ({
    uniqEntityDate: uniqueIndex("uniq_entity_date").on(
      table.entityType,
      table.entityId,
      table.menuPlanId,
      table.date
    ),
  })
);

export const stepReports = pgTable("step_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  dailyReportId: uuid("daily_report_id")
    .notNull()
    .references(() => dailyReports.id, { onDelete: "cascade" }),
  stepId: uuid("step_id")
    .notNull()
    .references(() => masterSteps.id, { onDelete: "cascade" }),
  notes: text("notes"),
  isCompleted: boolean("is_completed").default(false),
  storageId: uuid('storage_id').references(() => storage.id),
  imageURL: text('image_url'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const eventReports = pgTable("event_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  reportType: text('report_type'),
  date: date('date').notNull(),
  locaation: text('location'),
  description: text('location'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
});
