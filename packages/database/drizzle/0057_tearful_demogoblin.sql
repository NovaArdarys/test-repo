ALTER TYPE "public"."entity_type_enum" ADD VALUE 'beneficiary' BEFORE 'kitchen_daily_report';--> statement-breakpoint
ALTER TYPE "public"."entity_type_enum" ADD VALUE 'beneficiary_daily_report' BEFORE 'profile';--> statement-breakpoint
ALTER TYPE "public"."entity_type_enum" ADD VALUE 'incident_report_school' BEFORE 'incident_report_beneficiary';