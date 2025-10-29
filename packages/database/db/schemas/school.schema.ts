import { boolean, decimal, pgTable, text, timestamp, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { storage } from "./storage.schema";

export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  kitchenId: uuid('kitchen_id'),
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

export const userSchools = pgTable(
  "user_schools",
  {
    userId: uuid("user_id").notNull(),
    schoolId: uuid("school_id").notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by"),
  },
  (table) => {
    return {
      uniqueUser: uniqueIndex("user_schools_user_unique").on(table.userId),
    };
  }
);

