import { Hono } from 'hono';

import dailyReports from '@/routes/public/daily.report.route';
import eventReports from '@/routes/public/event.report.route';

const app = new Hono()
  .route('/event-reports', eventReports)
  .route('/daily-reports', dailyReports);

export default app;
