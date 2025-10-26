import { Hono } from 'hono';

import auth from '@/routes/auth.route';

const app = new Hono()
    .route('/auth', auth);

export default app;
