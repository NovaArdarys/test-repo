import { inArray, notInArray, sql, SQL } from "drizzle-orm";
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

type FilterValue = string | number | boolean | Array<string | number | boolean> | SQL;

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
  conditions: Partial<Record<keyof T, any>>
): SQL | undefined {
  const clauses: SQL[] = [];

  for (const [k, v] of Object.entries(conditions)) {
    if (v && typeof v === 'object') {
      const validKeys = Object.entries((v: any) => v).filter(([_, val]) =>
        Array.isArray(val) ? val.length > 0 : val !== undefined && val !== null
      );
      if (validKeys.length === 0) delete (conditions as any)[k];
    }
  }

  for (const [key, rawValue] of Object.entries(conditions)) {
    if (rawValue === undefined || rawValue === null) continue;
    const column = table[key as keyof T];
    if (!column) continue;

    if ((rawValue as any)?.isSql) {
      clauses.push(rawValue as SQL);
      continue;
    }

    if (["string", "number", "boolean"].includes(typeof rawValue)) {
      clauses.push(sql`${column} = ${rawValue}`);
      continue;
    }

    const condition = rawValue as any;

    if ("eq" in condition) clauses.push(sql`${column} = ${condition.eq}`);
    if ("ne" in condition) clauses.push(sql`${column} <> ${condition.ne}`);
    if ("lt" in condition) clauses.push(sql`${column} < ${condition.lt}`);
    if ("lte" in condition) clauses.push(sql`${column} <= ${condition.lte}`);
    if ("gt" in condition) clauses.push(sql`${column} > ${condition.gt}`);
    if ("gte" in condition) clauses.push(sql`${column} >= ${condition.gte}`);
    if ("like" in condition) clauses.push(sql`${column} LIKE ${condition.like}`);
    if ("ilike" in condition) clauses.push(sql`${column} ILIKE ${condition.ilike}`);

    if ("in" in condition && Array.isArray(condition.in) && condition.in.length > 0)
      clauses.push(sql`${inArray(column, condition.in)}`);

    if ("nin" in condition && Array.isArray(condition.nin) && condition.nin.length > 0)
      clauses.push(sql`${notInArray(column, condition.nin)}`);
  }

  return clauses.length > 0 ? sql.join(clauses, sql` AND `) : undefined;
}

export async function buildPaginatedWhere<T extends Record<string, any>>({
  table,
  tableName,
  base = {},
  extra = [],
  page,
  limit,
}: PaginatedWhereParams<T>): Promise<{ where?: SQL; meta: PaginationMeta; }> {
  const baseWhere = buildWhere(table, base);
  const validExtras = (extra || []).filter((x): x is SQL => Boolean(x));

  const allConditions: SQL[] = [];
  if (baseWhere) allConditions.push(baseWhere);
  if (validExtras.length > 0) allConditions.push(sql.join(validExtras, sql` AND `));

  const hasConditions = allConditions.length > 0;
  const where = hasConditions ? sql.join(allConditions, sql` AND `) : undefined;

  let query: SQL;
  if (hasConditions && where) {
    query = sql`SELECT COUNT(*)::int AS total FROM ${sql.raw(tableName)} WHERE ${where}`;
  } else {
    query = sql`SELECT COUNT(*)::int AS total FROM ${sql.raw(tableName)}`;
  }

  try {
    const q = (query as any).getSQL?.() ?? (query as any).toQuery?.();
    console.log("🧩 FINAL SQL:", q?.text ?? "(no text)");
  } catch { }

  const totalResult = await db.execute<{ total: number; }>(query);
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