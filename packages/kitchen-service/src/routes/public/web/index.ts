import { Hono } from 'hono';

import kitchen from "./kitchen.route";
import supplier from "./supplier.route";
import supplierFoodItem from "./supplier.food.item.route";

const app = new Hono();

app.route('/kitchens', kitchen);
app.route('/suppliers', supplier);
app.route('/suppliers-foods', supplierFoodItem);


export default app;
