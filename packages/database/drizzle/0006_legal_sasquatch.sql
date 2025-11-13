DROP INDEX "uniq_kitchen_driver_date";--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_kitchen_driver_date" ON "deliveries" USING btree ("kitchen_id","driver_id","delivery_date","portion_type");