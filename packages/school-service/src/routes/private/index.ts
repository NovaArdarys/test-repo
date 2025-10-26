import { Hono } from 'hono';
import schools from './school.route';

const app = new Hono();

app.route('/schools', schools);

export default app;
