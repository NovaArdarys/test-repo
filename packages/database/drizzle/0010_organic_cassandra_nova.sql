-- Drop unique index lama
DROP INDEX IF EXISTS uniq_kitchen_driver_date;
ALTER TABLE "deliveries" ALTER COLUMN "driver_id" DROP NOT NULL;

-- partial unique index baru
CREATE UNIQUE INDEX uniq_kitchen_driver_date_not_null
ON deliveries (kitchen_id, driver_id, delivery_date, portion_type)
WHERE driver_id IS NOT NULL;
