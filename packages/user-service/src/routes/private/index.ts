import { Hono } from 'hono';
import { checkAccessToken } from '@/middleware/auth.middleware';

import user from '@/routes/private/user.route';
import role from '@/routes/private/role.route';
import permission from '@/routes/private/permission.route';
import menu from '@/routes/private/role.menu.route';

const app = new Hono();

// Apply authentication to all private routes
app.use('*', checkAccessToken);

app.route('/user', user);
app.route('/role', role);
app.route('/permission', permission);
app.route('/menu', menu);

export default app;

