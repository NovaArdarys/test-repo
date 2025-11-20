ALTER TABLE "ai_analysis_logs" ADD COLUMN "storage_id" uuid;--> statement-breakpoint
CREATE INDEX "idx_ai_storage_id" ON "ai_analysis_logs" USING btree ("storage_id");