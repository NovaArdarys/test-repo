CREATE INDEX "storages_entity_idx" ON "storages" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "storages_created_by_idx" ON "storages" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "storages_created_at_idx" ON "storages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "storages_entity_unique_idx" ON "storages" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_kitchens_user_unique" ON "user_kitchens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_schools_user_unique" ON "user_schools" USING btree ("user_id");