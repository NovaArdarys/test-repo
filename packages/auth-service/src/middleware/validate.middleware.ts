import { Context, Next } from "hono";
import { ZodSchema, z } from "zod";

const registry = new Map<string, { type: string; schema: ZodSchema<any>; }[]>();
const registered = new Set<string>();

export function getRouteSchemaRegistry() {
  return registry;
}

export function validate<
  S extends Partial<{ body: ZodSchema; query: ZodSchema; param: ZodSchema; }>
>(schemas: S, options?: { isPreload?: boolean; }) {
  const schemaMeta = Object.entries(schemas)
    .map(([type, schema]) => ({ type, schema }))
    .filter((v) => !!v.schema);

  const middleware = async (c: Context, next: Next) => {
    const method = c.req.method.toUpperCase();
    const routePath =
      (c.req as any).routePath || c.req.path.split("?")[0] || "/";
    const key = `${method}:${routePath}`;

    for (const { type, schema } of schemaMeta) {
      const regKey = `${key}:${type}`;
      if (!registered.has(regKey)) {
        const arr = registry.get(key) ?? [];
        arr.push({ type, schema });
        registry.set(key, arr);
        registered.add(regKey);
      }
    }

    const isPreload =
      (c as any).__isPreload ||
      options?.isPreload ||
      !(typeof c.req?.json === "function" && typeof c.req?.header === "function");

    const result: any = {};
    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      let data: any = {};

      try {
        switch (source) {
          case "param":
            data = c.req.param();
            break;
          case "query":
            data = c.req.query();
            break;
          case "body":
            const contentType = c.req.header?.("content-type") ?? "";
            data = contentType.includes("application/json")
              ? await c.req.json?.()
              : await c.req.parseBody?.();
            break;
        }
      } catch {
        data = {};
      }

      result[source] = isPreload ? {} : schema.parse(data);
    }

    c.set("validatedData", result);
    await next();
  };

  (middleware as any).__schemaMeta = schemaMeta;

  const withValidation =
    <
      const Name extends string,
      FN extends (c: any) => any
    >(
      fn: FN,
      name?: Name
    ) => {
      (fn as any).__schemaMeta = schemaMeta;

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
}
