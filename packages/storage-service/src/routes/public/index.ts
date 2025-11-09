import { Hono } from 'hono';

import storage from '@/routes/private/storage.route';
import { generateOpenAPIDoc } from '@/utils/autoRoute';

const app = new Hono();
app.route('/storage', storage);

app.get("/openapi.json", async (c) => {
  const handler = await generateOpenAPIDoc(app, {
    title: "Reports API",
    version: "1.0.0",
    description: "Auto-generated API documentation for storage",
    developmentServerUrl: "http://localhost:4001",
    productionServerUrl: "https://dev-mbg-be.midigi.id/storage",
  }, "/api");

  return handler(c, async () => { });
});

export default app;
