import { Hono } from 'hono';
import { checkAccessToken } from '@/middleware/auth.middleware';
import { 
  getMenusByRoleIdHandler, 
  getMenusListHandler,
  syncMenusToRoleHandler,
  createMenuHandler,
  updateMenuHandler,
  deleteMenuHandler,
  getMenuByIdHandler
} from '@/controllers/private/role.menu.controller';

const app = new Hono();

app.use(checkAccessToken);

// Menu Management
app.get('/', getMenusListHandler);
app.post('/', createMenuHandler);
app.get('/:id', getMenuByIdHandler);
app.put('/:id', updateMenuHandler);
app.delete('/:id', deleteMenuHandler);

// Role-Menu Assignment
app.get('/role/:roleId', getMenusByRoleIdHandler);
app.post('/role/:roleId/sync', syncMenusToRoleHandler);

export default app;
