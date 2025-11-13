import { Hono } from 'hono';

import user from '@/routes/public/web/user.detai.route';
import permissions from '@/routes/public/web/permission.route';
import roles from '@/routes/public/web/role.route';
import region from '@/routes/public/web/region.route';
import { generateOpenAPIDoc } from '@/utils/autoRoute';

const app = new Hono();

app.route('/users', user);
app.route('/permissions', permissions);
app.route('/roles', roles);
app.route('/regions', region);


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
