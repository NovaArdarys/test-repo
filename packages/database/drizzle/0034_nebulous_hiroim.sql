CREATE TYPE "public"."analysis_type" AS ENUM('food_authenticity', 'people_count', 'cleanliness', 'mealbox_count', 'food_detection');--> statement-breakpoint
CREATE TABLE "ai_analysis_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid,
	"analysis_type" "analysis_type" NOT NULL,
	"source_image_url" text,
	"output_image_url" text,
	"processing_time" numeric(8, 3),
	"threshold" numeric(5, 2),
	"result" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "storages_entity_unique_idx";--> statement-breakpoint
CREATE INDEX "idx_ai_analysis_type" ON "ai_analysis_logs" USING btree ("analysis_type");--> statement-breakpoint
CREATE INDEX "idx_ai_created_at" ON "ai_analysis_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "storages_entity_unique_idx" ON "storages" USING btree ("entity_type","entity_id") WHERE 
            "storages"."entity_type" NOT IN (
                'kitchen_daily_report', 
                'driver_daily_report', 
                'school_daily_report'
            )
        ;