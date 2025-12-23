import { db } from "@/db";
import { kitchens, suppliers } from "@/db/schemas";
import { asc, eq } from "drizzle-orm";

export async function getDashboardSuppliers() {
  return db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      phone: suppliers.phoneNumber,
      address: suppliers.address,
      kitchen: kitchens.name,
    })
    .from(suppliers)
    .leftJoin(kitchens, eq(kitchens.id, suppliers.kitchenId))
    .where(eq(suppliers.isDeleted, false))
    .orderBy(asc(suppliers.name));
}
