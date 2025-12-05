import { Hono } from 'hono';
import deliveries from './delivery.route';

const app = new Hono();
app.route('/deliveries', deliveries);

export default app;
