import { Hono } from 'hono';

import dailyReports from '@/routes/public/web/daily.report.route';
import eventReports from '@/routes/public/web/event.report.route';
import dashboard from '@/routes/public/web/dashboard.route';
import { generateOpenAPIDoc, } from '@/utils/autoRoute';

const app = new Hono()
  .route('/event-reports', eventReports)
  .route('/dashboard', dashboard)
  .route('/daily-reports', dailyReports);

app.get("/openapi.json", async (c) => {
  const handler = await generateOpenAPIDoc(app, {
    title: "Reports API",
    version: "1.0.0",
    description: "Auto-generated API documentation for daily & event reports",
    developmentServerUrl: "http://localhost:3009",
    productionServerUrl: "https://dev-mbg-be.midigi.id/reporting/api",
  }, "/api");

  return handler(c, async () => { });
});

export default app;
