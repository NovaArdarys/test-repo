CREATE TABLE "role_menus" (
	"role_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "menus_app" ALTER COLUMN "display_order" SET NOT NULL;