import type { ZodSchema } from "zod";

export function buildPaginationAndSort(query: any, schema: ZodSchema<any>, sortMapper: any) {
  const params = schema.parse(query);

  const safeSort = params.sort.filter(
    (s: any) => s.column in sortMapper
  );

  const orderBy = safeSort.map((s: any) =>
    sortMapper[s.column](s.direction)
  );

  return {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
    orderBy,
  };
}