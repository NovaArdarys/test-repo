DROP INDEX "uniq_entity_date";--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_entity_date" ON "daily_reports" USING btree ("entity_type","entity_id","menu_plan_id","date","portion_type");