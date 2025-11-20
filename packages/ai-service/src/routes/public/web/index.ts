import { Hono } from 'hono';
import ai from './ai.route';

const app = new Hono();

app.route("/ai", ai);

export default app;
