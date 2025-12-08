CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_actor_id" uuid NOT NULL,
	"user_received_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"title" text NOT NULL,
	"message" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "master_steps" ADD COLUMN "analysis_type" "analysis_type";--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_actor_id_users_id_fk" FOREIGN KEY ("user_actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_received_id_users_id_fk" FOREIGN KEY ("user_received_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;