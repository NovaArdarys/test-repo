
import { Hono } from 'hono';
import { rolePermissionsHandler } from '@/controllers/private/role.permissons.controller';

const app = new Hono()
  .post('/:roleId/permissons', rolePermissionsHandler);


export default app;
