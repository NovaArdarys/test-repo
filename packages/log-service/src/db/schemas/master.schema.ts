import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const provinces = pgTable('provinces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const regencies = pgTable('regencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  provinceId: uuid('province_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const districts = pgTable('districts', {
  id: uuid('id').primaryKey().defaultRandom(),
  regencyId: uuid('regency_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const villages = pgTable('villages', {
  id: uuid('id').primaryKey().defaultRandom(),
  districtId: uuid('district_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
});
