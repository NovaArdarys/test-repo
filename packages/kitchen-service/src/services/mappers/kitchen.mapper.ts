import { sql } from "drizzle-orm";

export const kitchenSortMapper = {
  name: (direction: "asc" | "desc") =>
    (table: any, helpers: any) =>
      sql`LOWER(${table.name}) ${sql.raw(direction.toLowerCase())}`,
  address: (direction: "asc" | "desc") =>
    (table: any, helpers: any) =>
      sql`LOWER(${table.address}) ${sql.raw(direction.toLowerCase())}`,

  created: (direction: "asc" | "desc") =>
    (table: any, helpers: any) =>
      direction === "asc"
        ? helpers.asc(table.createdAt)
        : helpers.desc(table.createdAt),

  status: (direction: "asc" | "desc") =>
    (table: any, helpers: any) =>
      sql`${table.status} ${sql.raw(direction.toLowerCase())}`,

  picName: (direction: "asc" | "desc") =>
    (table: any) =>
      sql`
        (
          SELECT LOWER(ud.first_name || ' ' || ud.last_name)
          FROM user_kitchens uk
          JOIN users u ON u.id = uk.user_id
          JOIN user_details ud ON ud.user_id = u.id
          WHERE uk.kitchen_id = ${table.id}
          LIMIT 1
        ) ${sql.raw(direction.toLowerCase())}
      `,
};
