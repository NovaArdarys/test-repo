ALTER TABLE "deliveries" ADD COLUMN "storage_id" uuid;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE set null ON UPDATE no action;