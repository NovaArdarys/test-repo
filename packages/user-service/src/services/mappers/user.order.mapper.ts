import { asc, desc, sql } from "drizzle-orm";

export const userSortMapper = {
  // sorting by name (nested, pakai subquery)
  name: (direction: 'asc' | 'desc') =>
    (table: any) =>
      sql`
        (
          SELECT LOWER(first_name || ' ' || last_name)
          FROM user_details ud
          WHERE ud.user_id = ${table.id}
        ) ${sql.raw(direction.toUpperCase())}
      `,

  email: (direction: 'asc' | 'desc') =>
    (table: any, helpers: any) =>
      direction === 'asc'
        ? helpers.asc(table.email)
        : helpers.desc(table.email),

  created: (direction: 'asc' | 'desc') =>
    (table: any, helpers: any) =>
      direction === 'asc'
        ? helpers.asc(table.createdAt)
        : helpers.desc(table.createdAt)
};
