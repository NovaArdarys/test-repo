import { Hono } from 'hono';
import { 
  getRolesListHandler, 
  getRoleByIdHandler, 
  getPermissionsByRoleIdHandler,
  syncPermissionsToRoleHandler
} from '@/controllers/private/role.controller';

const app = new Hono();

app.get('/', getRolesListHandler);
app.get('/:id', getRoleByIdHandler);

app.get('/:roleId/permissions', getPermissionsByRoleIdHandler);
app.post('/:roleId/sync-permissions', syncPermissionsToRoleHandler);

export default app;
