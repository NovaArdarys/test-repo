import { boolean, index, jsonb, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { analysisTypeEnum } from "./enums/enums";

export const aiAnalysisLogs = pgTable(
  'ai_analysis_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityId: uuid("entity_id"),
    storageId: uuid("storage_id"),
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
    storageIdIdx: index("idx_ai_storage_id").on(table.storageId),
    entityAnalysisUnique: unique('uq_ai_entity_analysis')
      .on(table.entityId, table.analysisType),
  })
);


export const servingDetections = pgTable("serving_detections", {
  id: uuid("id").primaryKey().defaultRandom(),

  stepReportId: uuid("step_report_id").notNull(),
  aiLogId: uuid("ai_log_id"),
  foodItemId: uuid("food_item_id"),

  detected: boolean("detected").notNull(),
  confidence: numeric("confidence", { precision: 6, scale: 4 }),

  overridden: boolean("overridden").default(false),
  overrideValue: boolean("override_value"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxStepReport: index("idx_serv_step_report").on(table.stepReportId),
  idxFoodItem: index("idx_serv_food_item").on(table.foodItemId),
}));


export const apdDetections = pgTable("apd_detections", {
  id: uuid("id").primaryKey().defaultRandom(),

  stepReportId: uuid("step_report_id").notNull(),
  aiLogId: uuid("ai_log_id").notNull(),

  personIndex: numeric("person_index").notNull(),

  apdType: text("apd_type").notNull(),
  isCompliant: boolean("is_compliant").notNull(),

  confidence: numeric("confidence", { precision: 6, scale: 4 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxStep: index("idx_apd_step").on(table.stepReportId),
  idxAI: index("idx_apd_ai").on(table.aiLogId),
}));

export const apdMasterItems = pgTable("apd_master_items", {
  id: uuid("id").primaryKey().defaultRandom(),

  apdType: text("apd_type").notNull(),
  label: text("label").notNull(),
  isRequired: boolean("is_required").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cleanlinessResults = pgTable("cleanliness_results", {
  id: uuid("id").primaryKey().defaultRandom(),

  stepReportId: uuid("step_report_id").notNull(),
  aiLogId: uuid("ai_log_id").notNull(),

  dirtyScore: numeric("dirty_score", { precision: 5, scale: 2 }).notNull(),
  finalStatus: text("final_status").notNull(),        // Clean / Dirty
  scoreThreshold: numeric("score_threshold", { precision: 5, scale: 2 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueStepAi: unique("uq_cleanliness_step_ai")
    .on(table.stepReportId, table.aiLogId),

  stepIndex: index("idx_clean_step_report_id").on(table.stepReportId),
  aiIndex: index("idx_clean_ai_log_id").on(table.aiLogId),
}));