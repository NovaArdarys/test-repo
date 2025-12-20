CREATE TABLE "apd_detections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_report_id" uuid NOT NULL,
	"ai_log_id" uuid NOT NULL,
	"person_index" numeric NOT NULL,
	"apd_type" text NOT NULL,
	"is_compliant" boolean NOT NULL,
	"confidence" numeric(6, 4),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apd_master_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apd_type" text NOT NULL,
	"label" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cleanliness_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_report_id" uuid NOT NULL,
	"ai_log_id" uuid NOT NULL,
	"dirty_score" numeric(5, 2) NOT NULL,
	"final_status" text NOT NULL,
	"score_threshold" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_cleanliness_step_ai" UNIQUE("step_report_id","ai_log_id")
);
--> statement-breakpoint
CREATE TABLE "serving_detections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_report_id" uuid NOT NULL,
	"ai_log_id" uuid,
	"food_item_id" uuid,
	"detected" boolean NOT NULL,
	"confidence" numeric(6, 4),
	"overridden" boolean DEFAULT false,
	"override_value" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_analysis_logs" DROP CONSTRAINT "uq_ai_entity_analysis";--> statement-breakpoint
CREATE INDEX "idx_apd_step" ON "apd_detections" USING btree ("step_report_id");--> statement-breakpoint
CREATE INDEX "idx_apd_ai" ON "apd_detections" USING btree ("ai_log_id");--> statement-breakpoint
CREATE INDEX "idx_clean_step_report_id" ON "cleanliness_results" USING btree ("step_report_id");--> statement-breakpoint
CREATE INDEX "idx_clean_ai_log_id" ON "cleanliness_results" USING btree ("ai_log_id");--> statement-breakpoint
CREATE INDEX "idx_serv_step_report" ON "serving_detections" USING btree ("step_report_id");--> statement-breakpoint
CREATE INDEX "idx_serv_food_item" ON "serving_detections" USING btree ("food_item_id");--> statement-breakpoint
-- ALTER TABLE "ai_analysis_logs" ADD CONSTRAINT "uq_ai_entity_analysis" UNIQUE("entity_id","analysis_type");