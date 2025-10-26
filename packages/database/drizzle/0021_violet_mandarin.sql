ALTER TABLE "suppliers_food_items" DROP CONSTRAINT "suppliers_food_items_supplier_id_suppliers_id_fk";
--> statement-breakpoint
ALTER TABLE "suppliers_food_items" ALTER COLUMN "supplier_id" DROP NOT NULL;