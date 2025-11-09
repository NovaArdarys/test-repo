ALTER TABLE "school_class_room" RENAME COLUMN "total_student" TO "total_recipient";--> statement-breakpoint
DROP INDEX "user_class_room_total_student_idx";--> statement-breakpoint
CREATE INDEX "user_class_room_total_student_idx" ON "school_class_room" USING btree ("total_recipient");