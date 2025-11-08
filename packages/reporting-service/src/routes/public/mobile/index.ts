import { Hono } from 'hono';

import dailyReports from '@/routes/public/mobile/mobile.daily.report.route';
import { generateOpenAPIDoc, } from '@/utils/autoRoute';

const app = new Hono()
  .route('/daily-reports', dailyReports);

app.get("/openapi.json", async (c) => {
  const handler = await generateOpenAPIDoc(app, {
    title: "Reports API",
    version: "1.0.0",
    description: "Auto-generated API documentation for daily & event reports",
    serverUrl: "http://localhost:3009",
  }, "/api/mobile");

  return handler(c, async () => { });
});

export default app;
