ALTER TABLE "deliveries" ADD COLUMN "target_portion" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "received_portion" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "taken_tray" integer DEFAULT 0 NOT NULL;