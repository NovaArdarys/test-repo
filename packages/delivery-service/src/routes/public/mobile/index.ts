import { Hono } from 'hono';
import deliveries from './delivery.route';
import locations from './location.route';
import { generateOpenAPIDoc } from '@/utils/autoRoute';

const app = new Hono();
app.route('/deliveries', deliveries);
app.route('/locations', locations);

app.get("/openapi.json", async (c) => {
  const handler = await generateOpenAPIDoc(app, {
    title: "Reports API",
    version: "1.0.0",
    description: "Auto-generated API documentation for daily & event reports, daily-reports digunakan untuk tampilan home driver,kitchen,school, beneficiary, sedangkan event report digunakan untuk get, create, update, delete event report berdasarkan user login",
    developmentServerUrl: "http://localhost:3005",
    productionServerUrl: "https://dev-mbg-be.midigi.id/delivery",
  }, "/api/mobile");

  return handler(c, async () => { });
});


export default app;
