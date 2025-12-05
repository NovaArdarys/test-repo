import { boolean, decimal, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { integer } from "drizzle-orm/pg-core/columns/integer";

export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  kitchenId: uuid('kitchen_id').notNull(),
  licenseNumber: varchar('license_number', { length: 50 }).unique(),
  isActive: boolean('is_active').default(true).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  portionCapacity: integer("portion_capacity").default(0),
  updatedBy: uuid('updated_by'),
});

export const driverLocations = pgTable('driver_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  driverId: uuid('driver_id').notNull(),
  deliveryId: uuid('delivery_id').notNull(),
  lon: decimal('lon', { precision: 10, scale: 6 }).notNull(),
  lat: decimal('lat', { precision: 10, scale: 6 }).notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdBy: uuid('created_by'),
});
