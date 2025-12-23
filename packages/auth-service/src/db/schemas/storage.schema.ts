import { sql } from "drizzle-orm";
import { entityTypeEnum } from "./enums/enums";
import { pgTable, uuid, text, varchar, timestamp, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";

export const storage = pgTable(
  "storages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fileName: text("file_name").notNull(),
    path: text("path").notNull(),
    meta: jsonb("meta")
      .$type<Record<string, any>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    fileUrl: text("file_url").notNull(),
    mimeType: varchar("mime_type", { length: 100 }),
    size: varchar("size", { length: 50 }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    createdBy: uuid("created_by"),
  },
  (table) => {
    return {
      entityIndex: index("storages_entity_idx").on(table.entityType, table.entityId),
      createdByIndex: index("storages_created_by_idx").on(table.createdBy),
      createdAtIndex: index("storages_created_at_idx").on(table.createdAt),

      // uniqueEntityFile: uniqueIndex("storages_entity_unique_idx").on(table.entityType, table.entityId).where(
      //   sql`
      //       ${table.entityType} NOT IN (
      //           'kitchen_daily_report', 
      //           'driver_daily_report', 
      //           'school_daily_report',
      //           'other',
      //           'kitchen'
      //           'driver',
      //           'school',
      //       )
      //   `
      // ),
    };
  }
);






