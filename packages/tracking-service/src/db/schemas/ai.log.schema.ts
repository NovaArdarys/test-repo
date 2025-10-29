import { index, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { analysisTypeEnum, entityTypeEnum } from "./enums/enums";

export const aiAnalysisLogs = pgTable(
  'ai_analysis_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityId: uuid("entity_id"),
    entityType: entityTypeEnum("entity_type").notNull(),
    analysisType: analysisTypeEnum('analysis_type').notNull(),
    sourceImageUrl: text('source_image_url'),
    outputImageUrl: text('output_image_url'),
    processingTime: numeric('processing_time', { precision: 8, scale: 3 }),
    threshold: numeric('threshold', { precision: 5, scale: 2 }),
    output: jsonb('output').notNull(),
    input: jsonb('input').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    analysisTypeIdx: index('idx_ai_analysis_type').on(table.analysisType),
    createdAtIdx: index('idx_ai_created_at').on(table.createdAt),
  })
);