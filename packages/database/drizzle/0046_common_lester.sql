CREATE TABLE "food_consumption_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_plan_id" uuid NOT NULL,
	"note" text,
	"reason" varchar(100),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "food_consumption_notes" ADD CONSTRAINT "food_consumption_notes_menu_plan_id_menu_plans_id_fk" FOREIGN KEY ("menu_plan_id") REFERENCES "public"."menu_plans"("id") ON DELETE cascade ON UPDATE cascade;