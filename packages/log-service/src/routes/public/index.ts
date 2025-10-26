import { Hono } from 'hono';
import logs from './log.route';
const app = new Hono();
app.route('/logs', logs);

export default app;
