// src/middleware/validate.middleware.ts
import { Context, Next } from "hono";
import { ZodSchema } from "zod";

/**
 * Validasi otomatis dengan Zod dan tagging metadata untuk OpenAPI.
 * @param schema ZodSchema yang digunakan untuk validasi.
 * @param source body | param | query
 */
export const validate =
  (schema: ZodSchema<any>, source: "body" | "param" | "query" = "body") => {
    const middleware = async (c: Context, next: Next) => {
      try {
        let data: any;
        switch (source) {
          case "param":
            data = c.req.param();
            break;
          case "query":
            data = c.req.query();
            break;
          default:
            try {
              data = await c.req.parseBody();
            } catch {
              data = {};
            }
        }

        const parsed = schema.parse(data);
        c.set("validatedData", parsed);
        await next();
      } catch (err: any) {
        const details = err.errors ?? JSON.parse(err.message);
        return c.json(
          {
            error: "Validation Error",
            details,
          },
          400
        );
      }
    };

    // 🔥 metadata untuk auto dokumentasi
    (middleware as any).__schemaMeta = { type: source, schema };

    return middleware;
  };
