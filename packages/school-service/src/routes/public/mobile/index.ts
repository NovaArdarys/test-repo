import { Hono } from 'hono';
import { generateOpenAPIDoc } from '@/utils/autoRoute';

const app = new Hono();

app.get("/openapi.json", async (c) => {
  const handler = await generateOpenAPIDoc(app, {
    title: "Reports API",
    version: "1.0.0",
    description: "Auto-generated API documentation for school",
    developmentServerUrl: "http://localhost:3010",
    productionServerUrl: "https://dev-mbg-be.midigi.id/school",
  }, "/api/mobile");

  return handler(c, async () => { });
});



export default app;
