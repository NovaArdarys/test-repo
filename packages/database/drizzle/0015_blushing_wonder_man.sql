ALTER TABLE "drivers" ADD COLUMN "portion_capacity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "small_delivery_time" timestamp DEFAULT now()::date + time '07:00';--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "large_delivery_time" timestamp DEFAULT now()::date + time '09:00';