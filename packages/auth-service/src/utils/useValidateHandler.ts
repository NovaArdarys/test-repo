import type { ZodSchema, z } from "zod";
import type { Context } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { catchAsync } from "@/utils/catchAsync";

/**
 * Type helper untuk context hasil validasi otomatis.
 */
export type ValidatedContext<
  S extends Partial<{ body: ZodSchema; query: ZodSchema; param: ZodSchema; }>
> = Context<{
  Variables: {
    validatedData: {
      [K in keyof S]: S[K] extends ZodSchema ? z.infer<S[K]> : undefined;
    };
  };
}>;

/**
 * Kombinasi otomatis `validate()` + `catchAsync()`
 * - Auto validasi sesuai schema
 * - Auto type inference `c.get("validatedData")`
 * - Auto error handling & logging dari catchAsync
 */
export function useValidatedHandler<
  S extends Partial<{ body: ZodSchema; query: ZodSchema; param: ZodSchema; }>,
  R
>(
  schemas: S,
  fn: (c: ValidatedContext<S>) => Promise<R> | R
) {
  return [validate(schemas), catchAsync(fn)] as const;
}
