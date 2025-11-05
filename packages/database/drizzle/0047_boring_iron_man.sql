CREATE TABLE "menu_plan_schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_plan_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "menu_plan_schools_kitchen" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "menu_plan_schools_kitchen" CASCADE;--> statement-breakpoint
ALTER TABLE "menu_plans" ADD COLUMN "kitchen_id" uuid;--> statement-breakpoint
ALTER TABLE "menu_plans" ADD CONSTRAINT "menu_plans_kitchen_id_kitchens_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchens"("id") ON DELETE no action ON UPDATE no action;