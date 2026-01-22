CREATE TABLE "job_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saga_id" uuid NOT NULL,
	"saga_type" varchar(100) NOT NULL,
	"job_type" varchar(100) NOT NULL,
	"service_name" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"result" jsonb,
	"error" jsonb,
	"attempt_count" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"created_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp,
	"failed_at" timestamp,
	"entity_id" varchar(255),
	"parent_job_id" uuid
);
--> statement-breakpoint
CREATE TABLE "saga_orchestration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saga_type" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"total_steps" integer NOT NULL,
	"completed_steps" integer DEFAULT 0,
	"failed_steps" integer DEFAULT 0,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
