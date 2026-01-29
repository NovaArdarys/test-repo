-- ALTER TABLE "master_steps" ALTER COLUMN "sub_domains" SET DATA TYPE text[];--> statement-breakpoint
-- ALTER TABLE "master_steps" ALTER COLUMN "sub_domains" SET DEFAULT '{}';--> statement-breakpoint
-- ALTER TABLE "roles" ALTER COLUMN "sub_domains" SET DATA TYPE text[];--> statement-breakpoint
-- ALTER TABLE "roles" ALTER COLUMN "sub_domains" SET DEFAULT '{}';

-- 1. Buat kolom temporary
ALTER TABLE "master_steps" ADD COLUMN "sub_domains_new" text[];
ALTER TABLE "roles" ADD COLUMN "sub_domains_new" text[];

-- 2. Salin data dengan konversi
UPDATE "master_steps" 
SET "sub_domains_new" = CASE 
  WHEN sub_domains IS NULL THEN NULL
  WHEN sub_domains = '{}' THEN ARRAY[]::text[]
  ELSE string_to_array(trim(both '{}' from sub_domains::text), ',')
END;

UPDATE "roles" 
SET "sub_domains_new" = CASE 
  WHEN sub_domains IS NULL THEN NULL
  WHEN sub_domains = '{}' THEN ARRAY[]::text[]
  ELSE string_to_array(trim(both '{}' from sub_domains::text), ',')
END;

-- 3. Drop kolom lama
ALTER TABLE "master_steps" DROP COLUMN "sub_domains";
ALTER TABLE "roles" DROP COLUMN "sub_domains";

-- 4. Rename kolom baru
ALTER TABLE "master_steps" RENAME COLUMN "sub_domains_new" TO "sub_domains";
ALTER TABLE "roles" RENAME COLUMN "sub_domains_new" TO "sub_domains";

-- 5. Set default
ALTER TABLE "master_steps" ALTER COLUMN "sub_domains" SET DEFAULT '{}';
ALTER TABLE "roles" ALTER COLUMN "sub_domains" SET DEFAULT '{}';