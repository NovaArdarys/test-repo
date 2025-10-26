ALTER TABLE "daily_reports" RENAME COLUMN "daily_report_id" TO "menu_plan_id";--> statement-breakpoint
ALTER TABLE "daily_reports" DROP CONSTRAINT "daily_reports_daily_report_id_menus_food_id_fk";
--> statement-breakpoint
DROP INDEX "uniq_entity_date";--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_menu_plan_id_menus_food_id_fk" FOREIGN KEY ("menu_plan_id") REFERENCES "public"."menus_food"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_entity_date" ON "daily_reports" USING btree ("entity_type","entity_id","menu_plan_id","date");