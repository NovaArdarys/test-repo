import { logLevelEnum } from "./enums/enums";
import { boolean, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const appLogs = pgTable('app_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  level: logLevelEnum('level').notNull(),
  message: text('message').notNull(),
  payload: jsonb('payload'),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
});


export const tokenLogs = pgTable('token_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenId: uuid('token_id').notNull(),
  userId: uuid('user_id').notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  success: boolean('success').notNull(),
  payload: jsonb('payload'),
  message: text('message'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
});