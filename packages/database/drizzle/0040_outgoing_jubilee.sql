ALTER TYPE "public"."food_type" ADD VALUE 'PLANT_BASED_PROTEIN' BEFORE 'CARBO';--> statement-breakpoint
ALTER TABLE "food_items" ADD CONSTRAINT "food_items_name_unique" UNIQUE("name");