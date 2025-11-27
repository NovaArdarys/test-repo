import { Hono } from 'hono';
import menuPlan from "./menu.plan.route";
import menus from "./menu.route";
import foodItem from "./food.item.route";
const app = new Hono();

app.route('/food-items', foodItem);
app.route('/menu-plans', menuPlan);
app.route('/menus', menus);

export default app;
