ALTER TABLE "job_status" ALTER COLUMN "attempt_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "job_status" ALTER COLUMN "max_attempts" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "job_status" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "saga_orchestration" ALTER COLUMN "completed_steps" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "saga_orchestration" ALTER COLUMN "failed_steps" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "saga_orchestration" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "saga_orchestration" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "job_status" ADD COLUMN "entity_type" varchar(100);--> statement-breakpoint
ALTER TABLE "job_status" ADD CONSTRAINT "job_status_saga_id_saga_orchestration_id_fk" FOREIGN KEY ("saga_id") REFERENCES "public"."saga_orchestration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_status" ADD CONSTRAINT "job_status_parent_job_id_job_status_id_fk" FOREIGN KEY ("parent_job_id") REFERENCES "public"."job_status"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_saga_id_idx" ON "job_status" USING btree ("saga_id");--> statement-breakpoint
CREATE INDEX "job_status_idx" ON "job_status" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_service_idx" ON "job_status" USING btree ("service_name");--> statement-breakpoint
CREATE INDEX "job_entity_idx" ON "job_status" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "job_created_at_idx" ON "job_status" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "job_saga_status_idx" ON "job_status" USING btree ("saga_id","status");--> statement-breakpoint
CREATE INDEX "job_service_status_idx" ON "job_status" USING btree ("service_name","status");--> statement-breakpoint
CREATE INDEX "saga_status_idx" ON "saga_orchestration" USING btree ("status");--> statement-breakpoint
CREATE INDEX "saga_type_idx" ON "saga_orchestration" USING btree ("saga_type");--> statement-breakpoint
CREATE INDEX "saga_created_at_idx" ON "saga_orchestration" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "saga_type_status_idx" ON "saga_orchestration" USING btree ("saga_type","status");