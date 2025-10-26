ALTER TABLE "suppliers_foods" RENAME TO "suppliers_products";--> statement-breakpoint
ALTER TABLE "suppliers_products" DROP CONSTRAINT "suppliers_foods_supplier_id_suppliers_id_fk";
--> statement-breakpoint
ALTER TABLE "suppliers_products" DROP CONSTRAINT "suppliers_foods_food_item_id_food_items_id_fk";
--> statement-breakpoint
ALTER TABLE "suppliers_products" DROP CONSTRAINT "suppliers_foods_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "suppliers_products" DROP CONSTRAINT "suppliers_foods_updated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "suppliers_products" ADD CONSTRAINT "suppliers_products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_products" ADD CONSTRAINT "suppliers_products_food_item_id_food_items_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_products" ADD CONSTRAINT "suppliers_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_products" ADD CONSTRAINT "suppliers_products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;