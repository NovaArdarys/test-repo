import { Context, Next } from "hono";
import { ZodSchema } from "zod";

// Registry global
const routeSchemaRegistry = new Map<
  string,
  { type: string; schema: ZodSchema<any>; }[]
>();
const registered = new Set<string>();

export function getRouteSchemaRegistry() {
  return routeSchemaRegistry;
}

/**
 * Middleware validate otomatis:
 * - Bisa menerima:
 *    validate(loginSchema, "body")
 *    validate({ body: loginSchema, query: qSchema, param: pSchema })
 * - Auto detect method + routePath
 * - Auto register schema ke registry
 */
export const validate = (
  schemaOrObject:
    | ZodSchema<any>
    | {
      body?: ZodSchema<any>;
      query?: ZodSchema<any>;
      param?: ZodSchema<any>;
    },
  source?: "body" | "param" | "query"
) => {
  // Normalisasi input jadi { body?, query?, param? }
  const schemaMap: Record<"body" | "query" | "param", ZodSchema<any> | undefined> =
    schemaOrObject instanceof Object && "parse" in schemaOrObject
      ? { body: schemaOrObject as ZodSchema<any>, query: undefined, param: undefined }
      : (schemaOrObject as any);

  const middleware = async (c: Context, next: Next) => {
    const method = c.req.method.toUpperCase();
    const routePath = (c.req as any).routePath || c.req.path.split("?")[0] || "/";
    const key = `${method}:${routePath}`;

    const targets: ("body" | "query" | "param")[] = source
      ? [source]
      : (Object.keys(schemaMap).filter(
        (k) => schemaMap[k as "body" | "query" | "param"]
      ) as ("body" | "query" | "param")[]);

    const validatedData: Record<string, any> = {};

    for (const src of targets) {
      const schema = schemaMap[src];
      if (!schema) continue;

      const regKey = `${key}:${src}`;
      if (!registered.has(regKey)) {
        const arr = routeSchemaRegistry.get(key) ?? [];
        arr.push({ type: src, schema });
        routeSchemaRegistry.set(key, arr);
        registered.add(regKey);
        console.log(`🧩 Registered schema → ${key} (${src})`);
      }

      try {
        let data: any;
        switch (src) {
          case "param":
            data = c.req.param();
            break;
          case "query":
            data = c.req.query();
            break;
          default:
            const contentType = c.req.header?.("content-type") ?? "";
            data = contentType.includes("application/json")
              ? await c.req.json?.()
              : await c.req.parseBody?.();
            break;
        }

        const parsed = schema.parse(data);
        validatedData[src] = parsed;
      } catch (err: any) {
        const details = err.errors ?? JSON.parse(err.message);

        return c.json({ error: "Validation Error", source: src, details }, 400);
      }
    }

    const existing = c.get("validatedData") ?? {};
    c.set("validatedData", { ...existing, ...validatedData });
    await next();
  };

  (middleware as any).__schemaMeta = schemaMap;
  const withValidation =
    <
      const Name extends string,
      FN extends (c: any) => any
    >(
      fn: FN,
      name?: Name
    ) => {
      (fn as any).__schemaMeta = schemaMap;

      const baseName = (name ?? fn.name ?? "route").replace(/Handler$/, "") as Name;

      function defineValidation<
        N extends string,
        M extends (c: any, next: any) => any,
        H extends (c: any) => any
      >(name: N, middleware: M, handler: H) {
        return {
          [`${name}Validation`]: middleware,
          [`${name}Handler`]: handler,
        } as {
          readonly [K in `${N}Validation`]: M;
        } & {
            readonly [K in `${N}Handler`]: H;
          };
      }

      return defineValidation(baseName, middleware, fn);
    };


  return Object.assign(middleware, { withValidation });
};
