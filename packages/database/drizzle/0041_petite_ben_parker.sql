CREATE TABLE "food_consumption_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"food_item_id" uuid NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(100) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "food_consumption_items" ADD CONSTRAINT "food_consumption_items_record_id_menu_plans_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."menu_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_consumption_items" ADD CONSTRAINT "food_consumption_items_food_item_id_food_items_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE no action ON UPDATE no action;