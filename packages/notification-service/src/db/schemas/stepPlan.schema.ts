import { pgTable, serial, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { entityTypeEnum, stepKeyEnum } from "./enums/enums";
import { uuid } from "drizzle-orm/pg-core";

export const masterSteps = pgTable("master_steps", {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: entityTypeEnum("entity_type").notNull(),
  stepKey: stepKeyEnum("step_key").notNull(),
  stepName: varchar("step_name", { length: 100 }).notNull(),
  stepOrder: integer("step_order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  subDomains: text('sub_domains').array().default([]),
});