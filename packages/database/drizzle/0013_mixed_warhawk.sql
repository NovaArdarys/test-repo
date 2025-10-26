ALTER TABLE "daily_reports" DROP CONSTRAINT "daily_reports_kitchen_id_kitchens_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_reports" DROP CONSTRAINT "daily_reports_driver_id_drivers_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_reports" DROP CONSTRAINT "daily_reports_school_id_schools_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_reports" DROP COLUMN "kitchen_id";--> statement-breakpoint
ALTER TABLE "daily_reports" DROP COLUMN "driver_id";--> statement-breakpoint
ALTER TABLE "daily_reports" DROP COLUMN "school_id";