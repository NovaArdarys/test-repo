CREATE TABLE "beneficiary_food_allergies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"total_alergic" integer DEFAULT 0 NOT NULL,
	"food_alergic_id" uuid,
	"food_alt_id" uuid,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "joined_date" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "small_portion" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "large_portion" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "status" varchar(20) DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE "beneficiary_food_allergies" ADD CONSTRAINT "beneficiary_food_allergies_beneficiary_id_beneficiaries_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_food_allergies" ADD CONSTRAINT "beneficiary_food_allergies_food_alergic_id_food_items_id_fk" FOREIGN KEY ("food_alergic_id") REFERENCES "public"."food_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_food_allergies" ADD CONSTRAINT "beneficiary_food_allergies_food_alt_id_food_items_id_fk" FOREIGN KEY ("food_alt_id") REFERENCES "public"."food_items"("id") ON DELETE set null ON UPDATE no action;