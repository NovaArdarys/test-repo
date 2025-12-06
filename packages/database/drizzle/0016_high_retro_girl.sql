ALTER TABLE "beneficiaries" ALTER COLUMN "small_delivery_time" SET DATA TYPE time;--> statement-breakpoint
ALTER TABLE "beneficiaries" ALTER COLUMN "small_delivery_time" SET DEFAULT time '07:00';--> statement-breakpoint
ALTER TABLE "beneficiaries" ALTER COLUMN "large_delivery_time" SET DATA TYPE time;--> statement-breakpoint
ALTER TABLE "beneficiaries" ALTER COLUMN "large_delivery_time" SET DEFAULT time '09:00';