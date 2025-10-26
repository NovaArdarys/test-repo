import { Hono } from 'hono';

import user from '@/routes/private/user.route';
import rolePermussions from '@/routes/private/role.permissions.route';

const app = new Hono()
    .route('/user', user)
    .route('/role', rolePermussions);

export default app;
