import { Hono } from 'hono';

import dailyReports from '@/routes/public/mobile/mobile.daily.report.route';
import stepReports from '@/routes/public/mobile/mobile.step.report.route';
import eventReports from '@/routes/public/mobile/mobile.event.report.route';
import { generateOpenAPIDoc, } from '@/utils/autoRoute';

const app = new Hono()
  .route('/step-reports', stepReports)
  .route('/daily-reports', dailyReports)
  .route('/event-reports', eventReports);

app.get("/openapi.json", async (c) => {
  const handler = await generateOpenAPIDoc(app, {
    title: "Reports API",
    version: "1.0.0",
    description: "Auto-generated API documentation for daily & event reports, daily-reports digunakan untuk tampilan home driver,kitchen,school, beneficiary, sedangkan event report digunakan untuk get, create, update, delete event report berdasarkan user login",
    developmentServerUrl: "http://localhost:3009",
    productionServerUrl: "https://dev-mbg-be.midigi.id/reporting",
  }, "/api/mobile");

  return handler(c, async () => { });
});

export default app;
