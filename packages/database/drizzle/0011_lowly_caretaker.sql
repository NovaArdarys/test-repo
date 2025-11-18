ALTER TABLE "kitchens" DROP CONSTRAINT "kitchens_storage_id_storages_id_fk";
--> statement-breakpoint
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE set null ON UPDATE no action;