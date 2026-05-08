import { Hono } from 'hono';
import { 
  getPermissionsListHandler, 
  createPermissionHandler, 
  getPermissionByIdHandler, 
  updatePermissionHandler, 
  deletePermissionHandler 
} from '@/controllers/private/permission.controller';

const app = new Hono();

app.get('/', getPermissionsListHandler);
app.post('/', createPermissionHandler);
app.get('/:id', getPermissionByIdHandler);
app.put('/:id', updatePermissionHandler);
app.delete('/:id', deletePermissionHandler);

export default app;
