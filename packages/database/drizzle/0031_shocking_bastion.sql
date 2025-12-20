CREATE TABLE "delivery_step_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_beneficiary_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delivery_step_reports" ADD CONSTRAINT "delivery_step_reports_delivery_beneficiary_id_delivery_beneficiaries_id_fk" FOREIGN KEY ("delivery_beneficiary_id") REFERENCES "public"."delivery_beneficiaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_step_reports" ADD CONSTRAINT "delivery_step_reports_step_id_master_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."master_steps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_step_reports" ADD CONSTRAINT "delivery_step_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_delivery_step_reports_delivery_beneficiary" ON "delivery_step_reports" USING btree ("delivery_beneficiary_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_delivery_step" ON "delivery_step_reports" USING btree ("delivery_beneficiary_id","step_id");