import { db } from "@/db";
import { beneficiaries, drivers } from "@/db/schemas";
import { sql } from "drizzle-orm";

export async function getBeneficiariesAndDriversByKitchenIds(kitchenIds: string[]) {
  if (!kitchenIds?.length) {
    return { beneficiaries: [], drivers: [] };
  }

  const [beneficiariesRows, driversRows] = await Promise.all([
    db.execute(sql`
      SELECT id
      FROM beneficiaries
      WHERE is_deleted = false
        AND kitchen_id = ANY(${sql.raw(
      `ARRAY[${kitchenIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
    )})
    `),

    db.execute(sql`
      SELECT id
      FROM drivers
      WHERE is_deleted = false
        AND kitchen_id = ANY(${sql.raw(
      `ARRAY[${kitchenIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
    )})
    `),
  ]);

  return {
    beneficiaries: beneficiariesRows.rows.map((row: any) => row.id),
    drivers: driversRows.rows.map((row: any) => row.id),
  };
}
