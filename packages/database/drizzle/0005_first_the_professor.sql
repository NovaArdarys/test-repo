CREATE UNIQUE INDEX "user_session_token" ON "user_sessions" USING btree ("user_id","device_info");--> statement-breakpoint
ALTER TABLE "user_tokens" DROP COLUMN "used_at";