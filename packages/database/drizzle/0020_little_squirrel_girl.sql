ALTER TABLE "master_steps" ALTER COLUMN "sub_domains" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "master_steps" ALTER COLUMN "sub_domains" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "sub_domains" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "sub_domains" SET DEFAULT '{}';