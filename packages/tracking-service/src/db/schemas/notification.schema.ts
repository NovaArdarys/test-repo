import { pgTable, uuid, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./user.schema";

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userActorId: uuid("user_actor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userReceivedId: uuid("user_received_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<{
    menuPlanId?: string;
    entityId?: string;
    entityType?: string;
    relatedId?: string;
    relatedType?: string;
    kitchenId?: string;
    beneficiaryId?: string;
    extra?: any;
  }>(),
  title: text("title").notNull(),
  message: text("message"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
