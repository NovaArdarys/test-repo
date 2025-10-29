import { Hono } from 'hono';

import storage from '@/routes/private/storage.route';

const app = new Hono();
app.route('/storage', storage);
export default app;
