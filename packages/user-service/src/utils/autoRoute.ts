import { openAPIRouteHandler } from "hono-openapi";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getRouteSchemaRegistry } from "@/middleware/validate.middleware";
import type { Hono } from "hono";
import { compact } from "lodash";

function convertToJsonSchema(schema: any): any {
  if (schema?.def?.type === "object" && schema.def.shape) {
    const shape = schema.def.shape;
    const properties: Record<string, any> = {};

    for (const [key, val] of Object.entries(shape)) {
      properties[key] = convertZodField(val);
    }

    return {
      type: "object",
      properties,
    };
  }

  try {
    const res = zodToJsonSchema(schema, { $refStrategy: "none" });
    if (res.definitions?.Schema) return res.definitions.Schema;
    return res;
  } catch {
    return { type: "string" };
  }
}

function convertZodField(field: any): any {
  const def = field?.def ?? {};
  const type = def.type ?? "string";

  if (def.type === "enum") {
    const entries =
      def.entries ||
      field.enum ||
      def.values ||
      field.options ||
      {};
    const values = Array.isArray(entries)
      ? entries
      : Object.values(entries);

    return {
      type: "string",
      enum: values,
    };
  }


  switch (type) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "array":
      return {
        type: "array",
        items: convertZodField(def.innerType || {}),
      };
    case "object":
      return convertToJsonSchema(field);
    case "optional":
      return convertZodField(def.innerType || {});
    case "default":
      return {
        ...convertZodField(def.innerType || {}),
        default: def.defaultValue,
      };
    default:
      return { type: "string" };
  }
}

function collectAllRoutes(app: any, prefix = ""): any[] {
  const all: any[] = [];

  for (const r of app.routes ?? []) {
    all.push({
      ...r,
      path: `${prefix}${r.path}`.replace(/\/+$/, "") || "/",
    });
  }

  for (const mw of app.middleware ?? []) {
    if (mw.path && mw.handler?.routes) {
      all.push(...collectAllRoutes(mw.handler, `${prefix}${mw.path}`));
    }
  }

  return all;
}


export async function generateOpenAPIDoc(
  app: Hono,
  info: { title: string; version: string; developmentServerUrl?: string; productionServerUrl?: string; description?: string; },
  prefix = ""
) {
  await preloadSchemas(app);
  const allRoutes = collectAllRoutes(app);

  const registry = getRouteSchemaRegistry();
  const paths: Record<string, any> = {};

  console.log("📦 Registry content:");
  for (const [k, v] of Array.from(registry.entries())) {
    console.log(`   ${k} => [${v.map((x) => x.type).join(", ")}]`);
  }

  for (const route of allRoutes) {
    const fullPath = `${prefix}${route.path}`.replace(/:([A-Za-z0-9_]+)/g, "{$1}").replace(/\/+$/, "") || "/";
    const originalFullPath = `${prefix}${route.path}`.replace(/\/+$/, "") || "/";
    const method = route.method?.toUpperCase?.() ?? "GET";
    const key = `${method}:${originalFullPath}`;

    const schemaMeta = registry.get(key?.replace(prefix, "")) ?? [];
    if (!schemaMeta.length) continue;

    const parameters: any[] = [];
    let requestBody: any;
    let responses: any;

    for (const meta of schemaMeta) {
      let jsonSchema: any;
      try {
        jsonSchema = convertToJsonSchema(meta.schema);

        if (jsonSchema.definitions?.Schema) {
          jsonSchema = jsonSchema.definitions.Schema;
        }
      } catch (err) {
        console.warn(`⚠️ Gagal konversi schema untuk ${key} (${meta.type})`, err);
        continue;
      }

      // 🔹 PARAM
      if (meta.type === "param") {
        const props = jsonSchema.properties ?? {};
        const requiredProps = jsonSchema.required ?? [];

        for (const [propName, propSchema] of Object.entries(props)) {
          const isEnum = Array.isArray((propSchema as any).enum);
          parameters.push({
            name: propName,
            in: "path",
            required: true,
            schema: propSchema,
            ...(isEnum
              ? { example: (propSchema as any).enum?.[0] }
              : {}),
          });
        }
        continue;
      }

      // 🔹 QUERY
      if (meta.type === "query") {
        const props = jsonSchema.properties ?? {};
        const requiredProps = jsonSchema.required ?? [];
        for (const [propName, propSchema] of Object.entries(props)) {
          parameters.push({
            name: propName,
            in: "query",
            required: requiredProps.includes(propName),
            schema: propSchema,
          });
        }
        continue;
      }

      // 🔹 BODY
      if (meta.type === "body") {
        if (!jsonSchema.type && !jsonSchema.properties) {
          jsonSchema = {
            type: "object",
            properties: { value: { type: "string" } },
          };
        }

        requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: jsonSchema,
            },
          },
        };
      }

      if (meta.type === "response") {
        responses["200"] = {
          description: "Success",
          content: {
            "application/json": { schema: jsonSchema },
          },
        };
      }
    }

    const [_api, device] = compact(prefix.split("/"));
    const [tag] = compact(originalFullPath?.replace(prefix, "")?.split("/"));
    console.log(device, "===== splitted ======", prefix);

    paths[fullPath] ??= {};
    paths[fullPath][method.toLowerCase()] = {
      tags: [`${device ?? "website"} - ${tag}`],
      summary: `Auto-generated for ${method} ${fullPath}`,
      parameters: parameters.length ? parameters : undefined,
      requestBody,
      responses: responses && Object.keys(responses).length
        ? responses
        : {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        }
    };
  }

  return openAPIRouteHandler(app, {
    documentation: {
      openapi: "3.1.0",
      info: {
        title: info.title,
        version: info.version,
        description: info.description,
      },
      servers: [{ url: info.developmentServerUrl ?? "http://localhost:3000", description: "Auto-generated" }, { url: info.productionServerUrl ?? "http://localhost:3000", description: "Auto-generated" }],
      paths,
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [
        {
          BearerAuth: [],
        },
      ],
    },
  });
}

export async function preloadSchemas(app: Hono, prefix = "") {
  for (const route of app.routes ?? []) {
    const fullPath = `${prefix}${route.path}`.replace(/\/+$/, "") || "/";
    const c = {
      req: {
        method: route.method,
        path: route.path,
        routePath: fullPath,
        query: () => ({}),
        param: () => ({}),
        parseBody: async () => ({}),
        header: () => "application/json",
      },
      get: () => { },
      set: () => { },
      json: () => { },
    } as any;

    for (const handler of Array.isArray(route.handler)
      ? route.handler
      : [route.handler]) {
      if ((handler as any).__schemaMeta) {
        await handler(c, async () => { });
      }
    }
  }

  for (const mw of (app as any).middleware ?? []) {
    const subHandler = mw.handler;
    if (subHandler?.routes) {
      const subPrefix = `${prefix}${mw.path ?? ""}`;
      await preloadSchemas(subHandler, subPrefix);
    }
  }

  const registry = getRouteSchemaRegistry();
}