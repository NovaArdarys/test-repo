import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { storage } from "./storage.schema";

export const kitchens = pgTable('kitchens', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  address: text('address'),
  phoneNumber: varchar('phone_number', { length: 20 }),
  lon: decimal('lon', { precision: 10, scale: 6 }),
  lat: decimal('lat', { precision: 10, scale: 6 }),
  provinceId: uuid('province_id'),
  regencyId: uuid('regency_id'),
  districtId: uuid('district_id'),
  villageId: uuid('village_id'),
  storageId: uuid('storage_id').references(() => storage.id),
  imageURL: text('image_url'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by'),
});

export const userKitchens = pgTable(
  "user_kitchens",
  {
    userId: uuid("user_id").notNull(),
    kitchenId: uuid("kitchen_id").notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by"),
  },
  (table) => {
    return {
      uniqueUser: uniqueIndex("user_kitchens_user_unique").on(table.userId),
    };
  }
);