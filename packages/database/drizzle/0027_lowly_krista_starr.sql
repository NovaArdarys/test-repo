ALTER TABLE "user_details" ADD COLUMN "storage_id" uuid;--> statement-breakpoint
ALTER TABLE "user_details" ADD COLUMN "iamge_url" text;--> statement-breakpoint
ALTER TABLE "user_details" ADD CONSTRAINT "user_details_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE no action ON UPDATE no action;