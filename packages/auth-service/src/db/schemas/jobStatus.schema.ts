import { pgTable, uuid, varchar, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const sagaOrchestration = pgTable('saga_orchestration', {
  id: uuid('id').primaryKey().defaultRandom(),
  sagaType: varchar('saga_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'COMPENSATING', 'COMPENSATED'
  totalSteps: integer('total_steps').notNull(),
  completedSteps: integer('completed_steps').default(0).notNull(),
  failedSteps: integer('failed_steps').default(0).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  statusIdx: index('saga_status_idx').on(table.status),
  typeIdx: index('saga_type_idx').on(table.sagaType),
  createdAtIdx: index('saga_created_at_idx').on(table.createdAt),
  typeStatusIdx: index('saga_type_status_idx').on(table.sagaType, table.status),
}));

export const jobStatus = pgTable('job_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  sagaId: uuid('saga_id')
    .notNull()
    .references(() => sagaOrchestration.id, { onDelete: 'cascade' }),
  sagaType: varchar('saga_type', { length: 100 }).notNull(),
  jobType: varchar('job_type', { length: 100 }).notNull(), // 'CREATE_REPORT', 'CREATE_DELIVERY'
  serviceName: varchar('service_name', { length: 100 }).notNull(), // 'report-service'
  status: varchar('status', { length: 50 }).notNull(), // 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'COMPENSATING', 'COMPENSATED'
  payload: jsonb('payload').notNull(),
  result: jsonb('result'),
  error: jsonb('error'),
  attemptCount: integer('attempt_count').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  failedAt: timestamp('failed_at'),
  entityId: varchar('entity_id', { length: 255 }), // menuPlanId, reportId, deliveryId
  entityType: varchar('entity_type', { length: 100 }), // 'menu_plan', 'report', 'delivery'
  parentJobId: uuid('parent_job_id')
    .references((): any => jobStatus.id, { onDelete: 'set null' }),
}, (table) => ({
  sagaIdIdx: index('job_saga_id_idx').on(table.sagaId),
  statusIdx: index('job_status_idx').on(table.status),
  serviceIdx: index('job_service_idx').on(table.serviceName),
  entityIdx: index('job_entity_idx').on(table.entityId),
  createdAtIdx: index('job_created_at_idx').on(table.createdAt),
  sagaStatusIdx: index('job_saga_status_idx').on(table.sagaId, table.status),
  serviceStatusIdx: index('job_service_status_idx').on(table.serviceName, table.status),
}));