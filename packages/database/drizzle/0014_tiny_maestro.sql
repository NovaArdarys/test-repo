DROP INDEX "uniq_entity_date";--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "daily_report_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_daily_report_id_menus_food_id_fk" FOREIGN KEY ("daily_report_id") REFERENCES "public"."menus_food"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_entity_date" ON "daily_reports" USING btree ("entity_type","entity_id","daily_report_id","date");