import { db } from "./packages/user-service/src/db";
import { roles } from "./packages/user-service/src/db/schemas";

async function run() {
  const allRoles = await db.select().from(roles);
  console.log(allRoles.map((r) => ({ id: r.id, name: r.name, domain: r.domain })));
  process.exit(0);
}
run();
