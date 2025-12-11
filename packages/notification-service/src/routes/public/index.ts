import { Hono } from 'hono';
import notificationRoute from '@/routes/public/notification.route';

const app = new Hono();
app.route("/notifications", notificationRoute);

export default app;
