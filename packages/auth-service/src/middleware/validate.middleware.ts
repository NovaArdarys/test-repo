import { Context, Next } from "hono";
import { ZodSchema } from "zod";

export const validate =
  (schema: ZodSchema<any>) =>
    async (c: Context, next: Next) => {
      try {
        const body = await c.req.parseBody();
        const parsed = schema.parse(body);
        c.set("validatedData", parsed);
        await next();
      } catch (err: any) {
        return c.json({ error: 'Validation Error', details: err.errors ?? JSON.parse(err.message) }, 400);
      }
    };
