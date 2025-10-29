import { pgTable, uuid, text, boolean, timestamp, varchar, jsonb, integer, decimal, bigint, pgEnum, date, uniqueIndex } from 'drizzle-orm/pg-core';
import { permissionTypeEnum, userTokenTypeEnum } from './enums/enums';
import type { InferInsertModel } from 'drizzle-orm';
import { storage } from './storage.schema';


export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by'),
});

export const userDetails = pgTable('user_details', {
  userId: uuid('user_id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  address: text('address'),
  dateOfBirth: date('date_of_birth'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by'),
  storageId: uuid('storage_id').references(() => storage.id),
  imageURL: text('image_url'),
});

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  deviceInfo: varchar('device_info', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 50 }),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
}, (table) => ({
  userSessionsToken: uniqueIndex('user_session_token').on(table.userId, table.deviceInfo),
}));
export const userTokens = pgTable('user_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  token: varchar('token', { length: 1024 }).notNull().unique(),
  type: userTokenTypeEnum('type').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
}, (table) => ({
  uniqueUserToken: uniqueIndex('unique_user_token').on(table.userId, table.type),
}));

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by'),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  type: permissionTypeEnum('type').notNull(),
  resource: varchar('resource', { length: 255 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by'),
});

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull(),
  roleId: uuid('role_id').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
});

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull(),
  permissionId: uuid('permission_id').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
});

export const menusApp = pgTable('menus_app', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  path: varchar('path', { length: 255 }).notNull(),
  parentId: uuid('parent_id'),
  icon: varchar('icon', { length: 100 }),
  displayOrder: integer('display_order').default(0),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  updatedBy: uuid('updated_by'),
});

export type CreateUserInput = InferInsertModel<typeof users>;

export type UpdateUserInput = Partial<
  Omit<
    InferInsertModel<typeof users>,
    'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'
  >
>;

export type UpdateUserDetailInput = Partial<
  Omit<
    InferInsertModel<typeof userDetails>,
    'userId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'
  >
>;


export type CreateRoleInput = InferInsertModel<typeof roles>;

export type UpdateRoleInput = Partial<
  Omit<
    InferInsertModel<typeof roles>,
    'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'
  >
>;


export type CreatePermissionInput = InferInsertModel<typeof permissions>;


export type UpdatePermissionInput = Partial<
  Omit<
    InferInsertModel<typeof permissions>,
    'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'
  >
>;
