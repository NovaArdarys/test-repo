ALTER TABLE "deliveries" ADD COLUMN "delivery_code" text;

-- Drop unique index lama
DROP INDEX IF EXISTS uniq_kitchen_driver_date_not_null;

-- Unique index baru termasuk code
CREATE UNIQUE INDEX uniq_kitchen_driver_date_code_not_null
ON deliveries (kitchen_id, driver_id, delivery_date, portion_type, delivery_code)
WHERE driver_id IS NOT NULL;