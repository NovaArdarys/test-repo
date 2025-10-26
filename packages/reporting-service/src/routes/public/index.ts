import { Hono } from 'hono';

import dailyReports from '@/routes/public/daily.report.route';

const app = new Hono()
  .route('/daily-reports', dailyReports);

export default app;
