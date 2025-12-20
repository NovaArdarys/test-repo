ALTER TABLE "menu_plan_beneficiaries" ADD COLUMN "small_portion" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "menu_plan_beneficiaries" ADD COLUMN "large_portion" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "menu_plan_beneficiaries" ADD COLUMN "small_delivery_time" time DEFAULT time '07:00';--> statement-breakpoint
ALTER TABLE "menu_plan_beneficiaries" ADD COLUMN "large_delivery_time" time DEFAULT time '09:00';