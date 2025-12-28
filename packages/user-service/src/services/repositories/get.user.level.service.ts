import { db } from "@/db";
import { roles, userRoles } from "@/db/schemas";
import { eq, and, sql } from "drizzle-orm";

export async function getCurrentUserLevel(userId: string) {

  if (!userId) return 999;

  const result = await db
    .select({
      level: sql<number>`MIN(${roles.level})`,
    })
    .from(userRoles)
    .innerJoin(
      roles,
      and(
        eq(userRoles.roleId, roles.id),
        eq(roles.isDeleted, false)
      )
    )
    .where(eq(userRoles.userId, userId));

  return result[0]?.level ?? 999;
}