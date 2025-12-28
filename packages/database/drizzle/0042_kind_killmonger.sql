ALTER TABLE "food_consumption_items" RENAME COLUMN "record_id" TO "menu_plan_id";--> statement-breakpoint
ALTER TABLE "food_consumption_items" DROP CONSTRAINT "food_consumption_items_record_id_menu_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "food_consumption_items" ADD CONSTRAINT "food_consumption_items_menu_plan_id_menu_plans_id_fk" FOREIGN KEY ("menu_plan_id") REFERENCES "public"."menu_plans"("id") ON DELETE cascade ON UPDATE no action;