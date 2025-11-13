import { Hono } from 'hono';

import kitchen from "./kitchen.route";
import supplier from "./supplier.route";

const app = new Hono();

app.route('/kitchens', kitchen);
app.route('/suppliers', supplier);

export default app;
