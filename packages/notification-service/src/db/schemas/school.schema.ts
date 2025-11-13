import {
  boolean,
  decimal,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  uniqueIndex,
  index,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { storage } from "./storage.schema";
import { foodItems, menuPlans } from "./food.schema";

export const beneficiaries = pgTable("beneficiaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  kitchenId: uuid("kitchen_id"),
  address: text("address"),
  category: text("category"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  lon: decimal("lon", { precision: 10, scale: 6 }),
  lat: decimal("lat", { precision: 10, scale: 6 }),
  provinceId: uuid("province_id"),
  regencyId: uuid("regency_id"),
  districtId: uuid("district_id"),
  villageId: uuid("village_id"),
  storageId: uuid("storage_id").references(() => storage.id, {
    onDelete: "set null",
  }),
  imageUrl: text("image_url"),
  isDeleted: boolean("is_deleted").default(false).notNull(),

  joinedDate: timestamp("joined_date").defaultNow(),
  smallPortion: integer("small_portion").default(0),
  largePortion: integer("large_portion").default(0),
  status: varchar("status", { length: 20 }).default("ACTIVE"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
});

export const userBeneficiaries = pgTable(
  "user_beneficiaries",
  {
    userId: uuid("user_id").notNull(),
    beneficiaryId: uuid("beneficiary_id").notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by"),
  },
  (table) => ({
    userBeneficiaryUnique: uniqueIndex("user_beneficiaries_user_beneficiary_unique").on(
      table.userId,
      table.beneficiaryId
    ),
    notDeletedIdx: index("user_beneficiaries_not_deleted_idx").on(table.isDeleted),
  })
);

export const beneficiaryPortions = pgTable(
  "beneficiary_portions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beneficiaryId: uuid("beneficiary_id").notNull(),
    menuPlanId: uuid("menu_plan_id").references(() => menuPlans.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 100 }).notNull().unique(),
    date: date("beneficiary_date").defaultNow().notNull(),
    totalRecipient: integer("total_recipient").default(0).notNull(),
    storageId: uuid("storage_id").references(() => storage.id, {
      onDelete: "set null",
    }),
    portionType: varchar("portion_type", { length: 50 }),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by"),
  },
  (table) => ({
    beneficiaryIdIdx: index("beneficiary_portions_beneficiary_id_idx").on(
      table.beneficiaryId
    ),
    portionTypeIdx: index("beneficiary_portions_portion_type_idx").on(
      table.portionType
    ),
    notDeletedIdx: index("beneficiary_portions_not_deleted_idx").on(
      table.isDeleted
    ),
    totalRecipientIdx: index("beneficiary_portions_total_recipient_idx").on(
      table.totalRecipient
    ),
  })
);

export const beneficiaryFoodAllergies = pgTable("beneficiary_food_allergies", {
  id: uuid("id").primaryKey().defaultRandom(),

  beneficiaryId: uuid("beneficiary_id")
    .notNull()
    .references(() => beneficiaries.id, { onDelete: "cascade" }),

  totalAlergic: integer("total_alergic").default(0).notNull(),

  foodAlergicId: uuid("food_alergic_id")
    .references(() => foodItems.id, { onDelete: "set null" }),

  foodAltId: uuid("food_alt_id")
    .references(() => foodItems.id, { onDelete: "set null" }),

  description: text("description"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").notNull(),

  updatedAt: timestamp("updated_at"),
  updatedBy: uuid("updated_by"),
});
