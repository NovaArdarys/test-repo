ALTER TABLE "school_class_room" ADD COLUMN "total_student" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "school_class_room" ADD COLUMN "storage_id" uuid;--> statement-breakpoint
ALTER TABLE "school_class_room" ADD CONSTRAINT "school_class_room_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_class_room_total_student_idx" ON "school_class_room" USING btree ("total_student");