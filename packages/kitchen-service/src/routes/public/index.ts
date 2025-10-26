import { Hono } from 'hono';

import driver from "./driver.route";
import kitchen from "./kitchen.route";
import supplier from "./supplier.route";
import supplierFood from "./supplier.food.item.route";

const app = new Hono();

app.route('/suppliers-foods', supplierFood);
app.route('/drivers', driver);
app.route('/kitchens', kitchen);
app.route('/suppliers', supplier);

export default app;
