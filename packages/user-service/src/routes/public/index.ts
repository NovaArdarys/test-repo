import { Hono } from 'hono';

import user from '@/routes/public/user.detai.route';
import permissions from '@/routes/public/permission.route';
import roles from '@/routes/public/role.route';
import region from '@/routes/public/region.route';

const app = new Hono()
  .route('/users', user)
  .route('/permissions', permissions)
  .route('/roles', roles)
  .route('/regions', region);

export default app;
