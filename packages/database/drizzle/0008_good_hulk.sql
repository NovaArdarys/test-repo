ALTER TABLE "deliveries" ALTER COLUMN "kitchen_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ALTER COLUMN "kitchen_id" DROP NOT NULL;