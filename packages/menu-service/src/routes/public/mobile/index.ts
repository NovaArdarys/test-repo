import { Hono } from 'hono';
import menuPlan from "./menu.plan.route";
import foodItem from "./food.item.route";
import calendar from "./calendar.route";
import { generateOpenAPIDoc } from '@/utils/autoRoute';
const app = new Hono();

app.route('/food-items', foodItem);
app.route('/calendar', calendar);
app.route('/agenda', menuPlan);

app.get("/openapi.json", async (c) => {
  const handler = await generateOpenAPIDoc(app, {
    title: "Reports API",
    version: "1.0.0",
    description: "Auto-generated API documentation for daily & event reports, daily-reports digunakan untuk tampilan home driver,kitchen,school, beneficiary, sedangkan event report digunakan untuk get, create, update, delete event report berdasarkan user login",
    developmentServerUrl: "http://localhost:3007",
    productionServerUrl: "https://dev-mbg-be.midigi.id/menu",
  }, "/api/mobile");

  return handler(c, async () => { });
});


export default app;
