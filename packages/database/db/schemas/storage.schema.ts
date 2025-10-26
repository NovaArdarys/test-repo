import { entityTypeEnum } from "./enums/enums";
import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const storage = pgTable("storages", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: text("file_name").notNull(),
  path: text("path").notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  size: varchar("size", { length: 50 }),
  entityType: entityTypeEnum("entity_type").notNull(),
  entityId: uuid("entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: uuid("created_by"),
});
