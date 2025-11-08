import { Hono } from 'hono';

import dailyReports from '@/routes/public/daily.report.route';
import eventReports from '@/routes/public/event.report.route';
import { openAPIRouteHandler } from 'hono-openapi';
import { generateOpenAPIDoc } from '@/utils/autoRoute';

const app = new Hono()
  .route('/event-reports', eventReports)
  .route('/daily-reports', dailyReports);

app.get(
  '/openapi.json',
  generateOpenAPIDoc(app, {
    title: "Reports API",
    version: "1.0.0",
    description: "Auto-generated API documentation for daily & event reports",
    serverUrl: "http://localhost:3009",
  }, "/api")
);

export default app;
