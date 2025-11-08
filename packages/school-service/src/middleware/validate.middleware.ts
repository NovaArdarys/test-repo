import { Context, Next } from "hono";
import { ZodSchema } from "zod";

// Registry global
const routeSchemaRegistry = new Map<string, { type: string; schema: ZodSchema<any>; }[]>();
const registered = new Set<string>();

export function getRouteSchemaRegistry() {
  return routeSchemaRegistry;
}

/**
 * Middleware validate otomatis: 
 * - baca schema dari Zod
 * - auto detect method + routePath dari Context
 * - auto simpan ke registry sekali saja
 */
export const validate =
  (schema: ZodSchema<any>, source: "body" | "param" | "query" = "body") => {
    const middleware = async (c: Context, next: Next) => {
      const method = c.req.method.toUpperCase();
      const routePath =
        (c.req as any).routePath || c.req.path.split("?")[0] || "/";
      const key = `${method}:${routePath}`;

      if (!registered.has(`${key}:${source}`)) {
        const arr = routeSchemaRegistry.get(key) ?? [];
        arr.push({ type: source, schema });
        routeSchemaRegistry.set(key, arr);
        registered.add(`${key}:${source}`);
        console.log(`🧩 Registered schema → ${key} (${source})`);
      }

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
        return c.json({ error: "Validation Error", details }, 400);
      }
    };

    (middleware as any).__schemaMeta = { type: source, schema };
    return middleware;
  };
