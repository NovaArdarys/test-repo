ALTER TABLE "daily_reports" DROP CONSTRAINT "daily_reports_menu_plan_id_menus_food_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_menu_plan_id_menu_plans_id_fk" FOREIGN KEY ("menu_plan_id") REFERENCES "public"."menu_plans"("id") ON DELETE cascade ON UPDATE no action;