CREATE TABLE "user_class_room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"menu_plan_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_large_class" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "user_class_room_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "ai_analysis_logs" RENAME COLUMN "result" TO "entity_type";--> statement-breakpoint
ALTER TABLE "ai_analysis_logs" ADD COLUMN "output" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_analysis_logs" ADD COLUMN "input" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_class_room" ADD CONSTRAINT "user_class_room_menu_plan_id_menu_plans_id_fk" FOREIGN KEY ("menu_plan_id") REFERENCES "public"."menu_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_class_room_school_id_idx" ON "user_class_room" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "user_class_room_is_large_class_idx" ON "user_class_room" USING btree ("is_large_class");--> statement-breakpoint
CREATE INDEX "user_class_room_not_deleted_idx" ON "user_class_room" USING btree ("is_deleted");