import { boolean, decimal, pgTable, text, timestamp, uuid, varchar, uniqueIndex, index, integer, date } from "drizzle-orm/pg-core";
import { storage } from "./storage.schema";
import { menuPlans } from "./food.schema";

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

export const schoolClassroom = pgTable(
  "school_class_room",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull(),
    menuPlanId: uuid("menu_plan_id")
      .references(() => menuPlans.id, { onDelete: "set null" }),
    name: varchar("name", { length: 100 }).notNull().unique(),
    date: date("classroom_date").defaultNow().notNull(),
    totalStudent: integer("total_student").default(0).notNull(),
    storageId: uuid("storage_id").references(() => storage.id, { onDelete: "set null" }),
    portionType: varchar("portionType"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by"),
  },
  (table) => {
    return {
      schoolIdIdx: index("user_class_room_school_id_idx").on(table.schoolId),

      portionTypeIdx: index("user_class_room_is_large_class_idx").on(table.portionType),

      notDeletedIdx: index("user_class_room_not_deleted_idx").on(table.isDeleted),

      totalStudentIdx: index("user_class_room_total_student_idx").on(table.totalStudent),
    };
  }
);