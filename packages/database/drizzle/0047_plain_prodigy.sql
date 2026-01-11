ALTER TABLE "delivery_step_reports" DROP CONSTRAINT "delivery_step_reports_step_id_master_steps_id_fk";
--> statement-breakpoint
ALTER TABLE "delivery_step_reports" ADD CONSTRAINT "delivery_step_reports_step_id_step_reports_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."step_reports"("id") ON DELETE cascade ON UPDATE no action;