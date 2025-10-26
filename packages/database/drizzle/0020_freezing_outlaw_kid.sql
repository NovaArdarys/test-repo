ALTER TYPE "public"."entity_type_enum" ADD VALUE 'other';--> statement-breakpoint
ALTER TABLE "storages" RENAME COLUMN "description" TO "file_name";--> statement-breakpoint
ALTER TABLE "food_items" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."food_type";--> statement-breakpoint
CREATE TYPE "public"."food_type" AS ENUM('PROTEIN', 'CARBO', 'VEGETABLE', 'FRUIT', 'DRINK', 'OTHER');--> statement-breakpoint
ALTER TABLE "food_items" ALTER COLUMN "type" SET DATA TYPE "public"."food_type" USING "type"::"public"."food_type";--> statement-breakpoint
ALTER TABLE "storages" ALTER COLUMN "entity_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "storages" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "kitchen_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "storages" ADD COLUMN "path" text NOT NULL;--> statement-breakpoint
ALTER TABLE "storages" ADD COLUMN "mime_type" varchar(100);--> statement-breakpoint
ALTER TABLE "storages" ADD COLUMN "size" varchar(50);