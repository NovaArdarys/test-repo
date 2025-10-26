import { Context, Next } from "hono";
import { ZodSchema } from "zod";

/**
 * @param schema Zod untuk divalidasi.
 * @param source Sumber data yang akan divalidasi ('body', 'param', atau 'query'). Default adalah 'body'.
 */
export const validate =
  (schema: ZodSchema<any>, source: 'body' | 'param' | 'query' = 'body') =>
    async (c: Context, next: Next) => {
      try {
        let data: any;
        switch (source) {
          case 'param':
            data = c.req.param();
            break;
          case 'query':
            data = c.req.query();
            break;
          case 'body':
          default:
            try {
              data = await c.req.parseBody();
            } catch (e) {
              data = {};
            }
            break;
        }

        const parsed = schema.parse(data);

        c.set("validatedData", parsed);
        await next();
      } catch (err: any) {

        console.log(err.errors, "----- Validation Error Details ------", err.message);
        const details = err.errors ?? JSON.parse(err.message);


        return c.json({
          error: 'Validation Error',
          details: details
        }, 400);
      }
    };
