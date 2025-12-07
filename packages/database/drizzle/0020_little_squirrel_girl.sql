ALTER TABLE "master_steps"
ALTER COLUMN "sub_domains"
SET DATA TYPE text[]
USING "sub_domains"::text[];

ALTER TABLE "master_steps"
ALTER COLUMN "sub_domains"
SET DEFAULT '{}';

ALTER TABLE "roles"
ALTER COLUMN "sub_domains"
SET DATA TYPE text[]
USING "sub_domains"::text[];

ALTER TABLE "roles"
ALTER COLUMN "sub_domains"
SET DEFAULT '{}';
