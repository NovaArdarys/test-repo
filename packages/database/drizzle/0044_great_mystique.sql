ALTER TABLE "school_class_room" DROP CONSTRAINT "school_class_room_menu_plan_id_menu_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "school_class_room" ALTER COLUMN "menu_plan_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "school_class_room" ADD COLUMN "classroom_date" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "school_class_room" ADD CONSTRAINT "school_class_room_menu_plan_id_menu_plans_id_fk" FOREIGN KEY ("menu_plan_id") REFERENCES "public"."menu_plans"("id") ON DELETE set null ON UPDATE no action;