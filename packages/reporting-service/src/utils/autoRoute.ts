import { openAPIRouteHandler } from "hono-openapi";
import type { Hono } from "hono";

/**
 * Membangun otomatis dokumentasi OpenAPI dari seluruh route Hono.
 * Mendukung nested router (.route()).
 */
export function generateOpenAPIDoc(app: Hono, info: { title: string; version: string; description?: string; serverUrl?: string; }, prefix: string) {
  // Ambil semua route dari app instance
  const routes = (app as any).routes ?? [];
  const paths: Record<string, any> = {};

  for (const route of routes) {
    const path = `${prefix}${route.path}`;
    const method = route.method.toLowerCase();

    paths[path] ??= {};
    paths[path][method] = {
      description: `Auto-generated for ${method.toUpperCase()} ${path}`,
      responses: {
        200: {
          description: "Successful response",
        },
      },
    };
  }

  return openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: info.title,
        version: info.version,
        description: info.description,
      },
      servers: [
        {
          url: info.serverUrl ?? "http://localhost:3000",
          description: "Auto generated",
        },
      ],
      paths,
    },
  });
}
