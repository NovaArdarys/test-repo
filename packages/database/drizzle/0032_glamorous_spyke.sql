ALTER TABLE "kitchens" ADD COLUMN "storage_id" uuid;--> statement-breakpoint
ALTER TABLE "kitchens" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "storage_id" uuid;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "storage_id" uuid;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE no action ON UPDATE no action;