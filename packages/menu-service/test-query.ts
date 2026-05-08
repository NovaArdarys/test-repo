import { db } from "./src/db";
import { beneficiaries } from "./src/db/schemas";
import { eq, inArray } from "drizzle-orm";

async function run() {
  console.log("Testing beneficiaries query for kitchen: b221b7ed-7c76-4a63-8022-7253bf0b1c0f");
  const result = await db.select().from(beneficiaries).where(eq(beneficiaries.kitchenId, "b221b7ed-7c76-4a63-8022-7253bf0b1c0f"));
  console.log("Total matching kitchen ID:", result.length);
  const activeCount = result.filter(r => r.status === 'ACTIVE' && r.isDeleted === false).length;
  console.log("Total ACTIVE and not deleted:", activeCount);
  if (result.length > 0) {
      console.log("Sample:", result[0].name, "| status:", result[0].status, "| isDeleted:", result[0].isDeleted);
  }
  process.exit(0);
}

run().catch(console.error);
