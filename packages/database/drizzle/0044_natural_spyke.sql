ALTER TABLE "food_consumption_items" RENAME COLUMN "food_item_id" TO "menu_food_item_id";--> statement-breakpoint
ALTER TABLE "food_consumption_items" DROP CONSTRAINT "food_consumption_items_food_item_id_food_items_id_fk";
--> statement-breakpoint
ALTER TABLE "food_consumption_items" ADD CONSTRAINT "food_consumption_items_menu_food_item_id_menu_food_item_id_fk" FOREIGN KEY ("menu_food_item_id") REFERENCES "public"."menu_food_item"("id") ON DELETE no action ON UPDATE no action;