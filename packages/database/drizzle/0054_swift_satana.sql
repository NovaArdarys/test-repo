ALTER TABLE "menus_app" RENAME TO "app_menus";--> statement-breakpoint
ALTER TABLE "app_menus" DROP CONSTRAINT "menus_app_name_unique";--> statement-breakpoint
ALTER TABLE "app_menus" ADD CONSTRAINT "app_menus_name_unique" UNIQUE("name");