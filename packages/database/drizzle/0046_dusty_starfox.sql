ALTER TABLE "master_steps" ALTER COLUMN "entity_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "daily_reports" ALTER COLUMN "entity_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "storages" ALTER COLUMN "entity_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."entity_type_enum";--> statement-breakpoint
CREATE TYPE "public"."entity_type_enum" AS ENUM('kitchen', 'driver', 'school', 'kitchen_daily_report', 'driver_daily_report', 'school_daily_report', 'profile', 'profile_supplier', 'incident_report_kitchen', 'incident_report_driver', 'incident_report_beneficiary', 'other');--> statement-breakpoint
ALTER TABLE "master_steps" ALTER COLUMN "entity_type" SET DATA TYPE "public"."entity_type_enum" USING "entity_type"::"public"."entity_type_enum";--> statement-breakpoint
ALTER TABLE "daily_reports" ALTER COLUMN "entity_type" SET DATA TYPE "public"."entity_type_enum" USING "entity_type"::"public"."entity_type_enum";--> statement-breakpoint
ALTER TABLE "storages" ALTER COLUMN "entity_type" SET DATA TYPE "public"."entity_type_enum" USING "entity_type"::"public"."entity_type_enum";

-- ALTER TYPE "public"."entity_type_enum" ADD VALUE IF NOT EXISTS 'profile_supplier';
-- ALTER TYPE "public"."entity_type_enum" ADD VALUE IF NOT EXISTS 'incident_report_kitchen';
-- ALTER TYPE "public"."entity_type_enum" ADD VALUE IF NOT EXISTS 'incident_report_driver';
-- ALTER TYPE "public"."entity_type_enum" ADD VALUE IF NOT EXISTS 'incident_report_beneficiary';
-- ALTER TYPE "public"."entity_type_enum" ADD VALUE IF NOT EXISTS 'other';
