export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type APIPagination<T> = {
  data: T[];
  meta: PaginationMeta;
};