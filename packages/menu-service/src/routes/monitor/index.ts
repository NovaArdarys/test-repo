import { Hono } from 'hono';
import bullmq from "./bull.monitor.route";
import rabbitmq from "./rabbit.monitor.route";
const app = new Hono();

app.route('/bull', bullmq);
app.route('/rabbit', rabbitmq);

export default app;
