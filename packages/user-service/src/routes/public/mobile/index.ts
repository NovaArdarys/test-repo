import { Hono } from 'hono';

import user from './user.detai.route';
import { generateOpenAPIDoc } from '@/utils/autoRoute';

const app = new Hono();

app.route('/users', user);

app.get("/openapi.json", async (c) => {
  const handler = await generateOpenAPIDoc(app, {
    title: "Reports API",
    version: "1.0.0",
    description: "Auto-generated API documentation for user profile",
    developmentServerUrl: "http://localhost:3001",
    productionServerUrl: "https://dev-mbg-be.midigi.id/user",
  }, "/api/mobile");

  return handler(c, async () => { });
});


export default app;
