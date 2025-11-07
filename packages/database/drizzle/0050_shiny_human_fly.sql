ALTER TABLE "school_class_room" RENAME COLUMN "is_large_class" TO "portionType";--> statement-breakpoint
DROP INDEX "user_class_room_is_large_class_idx";--> statement-breakpoint
CREATE INDEX "user_class_room_is_large_class_idx" ON "school_class_room" USING btree ("portionType");