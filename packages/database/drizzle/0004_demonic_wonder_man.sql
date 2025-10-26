ALTER TABLE "permissions" DROP CONSTRAINT "permissions_name_unique";--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."permission_type";--> statement-breakpoint
CREATE TYPE "public"."permission_type" AS ENUM('API', 'WEBSITE', 'MOBILE');--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "type" SET DATA TYPE "public"."permission_type" USING "type"::"public"."permission_type";