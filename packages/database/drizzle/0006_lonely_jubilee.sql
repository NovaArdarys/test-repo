CREATE TABLE "menu_food_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"food_item_id" uuid NOT NULL,
	"menu_food_plan_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "menus_food" RENAME COLUMN "menu_plans_id" TO "menu_food_plan_id";--> statement-breakpoint
ALTER TABLE "menu_plans" DROP COLUMN "menu_id";