ALTER TABLE "event_reports" ADD COLUMN "entity_type" text;--> statement-breakpoint
ALTER TABLE "event_reports" ADD COLUMN "domain" text;--> statement-breakpoint
ALTER TABLE "event_reports" ADD COLUMN "domain_id" uuid;