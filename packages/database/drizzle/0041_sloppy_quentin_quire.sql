ALTER TABLE "user_class_room" RENAME TO "school_class_room";--> statement-breakpoint
ALTER TABLE "school_class_room" DROP CONSTRAINT "user_class_room_name_unique";--> statement-breakpoint
ALTER TABLE "school_class_room" DROP CONSTRAINT "user_class_room_menu_plan_id_menu_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "school_class_room" ADD CONSTRAINT "school_class_room_menu_plan_id_menu_plans_id_fk" FOREIGN KEY ("menu_plan_id") REFERENCES "public"."menu_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_class_room" ADD CONSTRAINT "school_class_room_name_unique" UNIQUE("name");