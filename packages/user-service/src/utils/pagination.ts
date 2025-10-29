import { sql, SQL } from "drizzle-orm";
import { db } from "../db";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedWhereParams<T extends Record<string, any>> {
  table: T;
  tableName: string;
  base?: Partial<Record<keyof T, any>>;
  extra?: (SQL | undefined | false | null)[];
  page: number;
  limit: number;
}

type FilterValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | SQL;


type ConditionOperator =
  | { eq?: FilterValue; }
  | { ne?: FilterValue; }
  | { lt?: FilterValue; }
  | { lte?: FilterValue; }
  | { gt?: FilterValue; }
  | { gte?: FilterValue; }
  | { like?: string; }
  | { ilike?: string; }
  | { in?: FilterValue[]; }
  | { nin?: FilterValue[]; };

type FieldCondition<T> = FilterValue | ConditionOperator;

export function buildWhere<T extends Record<string, any>>(
  table: T,
  conditions: Partial<Record<keyof T, FieldCondition<T>>>
): SQL | undefined {
  const clauses: SQL[] = [];

  for (const [key, rawValue] of Object.entries(conditions)) {
    if (rawValue === undefined || rawValue === null) continue;
    const column = table[key as keyof T];
    if (!column) continue;

    if ((rawValue as any)?.isSql) {
      clauses.push(rawValue as SQL);
      continue;
    }

    if (
      typeof rawValue === "string" ||
      typeof rawValue === "number" ||
      typeof rawValue === "boolean"
    ) {
      clauses.push(sql`${column} = ${rawValue}`);
      continue;
    }

    const condition = rawValue as ConditionOperator;

    if ("eq" in condition) clauses.push(sql`${column} = ${condition.eq}`);
    if ("ne" in condition) clauses.push(sql`${column} <> ${condition.ne}`);
    if ("lt" in condition) clauses.push(sql`${column} < ${condition.lt}`);
    if ("lte" in condition) clauses.push(sql`${column} <= ${condition.lte}`);
    if ("gt" in condition) clauses.push(sql`${column} > ${condition.gt}`);
    if ("gte" in condition) clauses.push(sql`${column} >= ${condition.gte}`);
    if ("like" in condition) clauses.push(sql`${column} LIKE ${condition.like}`);
    if ("ilike" in condition)
      clauses.push(sql`${column} ILIKE ${condition.ilike}`);
    if ("in" in condition && Array.isArray(condition.in))
      clauses.push(sql`${column} = ANY(${sql.raw(
        `ARRAY[${condition.in.map((v) => `'${v}'`).join(",")}]`
      )})`);
    if ("nin" in condition && Array.isArray(condition.nin))
      clauses.push(sql`${column} <> ALL(${sql.raw(
        `ARRAY[${condition.nin.map((v) => `'${v}'`).join(",")}]`
      )})`);
  }

  if (clauses.length === 0) return undefined;
  return sql.join(clauses, sql` AND `);
}
export async function buildPaginatedWhere<T extends Record<string, any>>({
  table,
  tableName,
  base = {},
  extra = [],
  page,
  limit,
}: PaginatedWhereParams<T>): Promise<{ where?: SQL; meta: PaginationMeta; }> {
  let where = buildWhere(table, base);

  const validExtras = extra.filter(Boolean) as SQL[];
  if (validExtras.length > 0) {
    const combined = sql.join(validExtras, sql` AND `);
    where = where ? sql`${where} AND ${combined}` : combined;
  }

  const totalResult = await db.execute<{ total: number; }>(
    sql`
      SELECT COUNT(*)::int AS total
      FROM ${sql.raw(tableName)}
      ${where ? sql`WHERE ${where}` : sql``}
    `
  );

  const total = totalResult.rows?.[0]?.total ?? 0;

  return {
    where,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
