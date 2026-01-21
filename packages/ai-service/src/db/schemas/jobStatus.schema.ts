import { pgTable, uuid, varchar, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const jobStatus = pgTable('job_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  sagaId: uuid('saga_id').notNull(),
  sagaType: varchar('saga_type', { length: 100 }).notNull(), // 'CREATE_MENU_PLAN'
  jobType: varchar('job_type', { length: 100 }).notNull(), // 'CREATE_REPORT', 'CREATE_DELIVERY'
  serviceName: varchar('service_name', { length: 100 }).notNull(), // 'report-service'
  status: varchar('status', { length: 50 }).notNull(),
  // 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'COMPENSATING', 'COMPENSATED'
  payload: jsonb('payload').notNull(),
  result: jsonb('result'),
  error: jsonb('error'),
  attemptCount: integer('attempt_count').default(0),
  maxAttempts: integer('max_attempts').default(3),
  createdAt: timestamp('created_at').defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  failedAt: timestamp('failed_at'),
  entityId: varchar('entity_id', { length: 255 }), // menuPlanId, reportId
  parentJobId: uuid('parent_job_id'),
});

export const sagaOrchestration = pgTable('saga_orchestration', {
  id: uuid('id').primaryKey().defaultRandom(),
  sagaType: varchar('saga_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  // 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'COMPENSATING', 'COMPENSATED'
  totalSteps: integer('total_steps').notNull(),
  completedSteps: integer('completed_steps').default(0),
  failedSteps: integer('failed_steps').default(0),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});