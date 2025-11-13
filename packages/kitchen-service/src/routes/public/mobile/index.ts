import { Hono } from 'hono';
import supplier from "./supplier.route";
import supplierFoodItem from "./supplier.food.item.route";
import { generateOpenAPIDoc } from '@/utils/autoRoute';
const app = new Hono();

app.route('/suppliers-foods', supplierFoodItem);
app.route('/suppliers', supplier);

app.get("/openapi.json", async (c) => {
  const handler = await generateOpenAPIDoc(app, {
    title: "Reports API",
    version: "1.0.0",
    description: "Auto-generated API documentation for kitchens, supplier (create, read, update, delete)",
    developmentServerUrl: "http://localhost:3006",
    productionServerUrl: "https://dev-mbg-be.midigi.id/kitchen",
  }, "/api/mobile");

  return handler(c, async () => { });
});


export default app;
