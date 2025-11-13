import { Hono } from 'hono';
import deliveries from './delivery.route';
import driverLocations from './driver.locations.route';

const app = new Hono();
app.route('/deliveries', deliveries);
app.route('/driver-locations', driverLocations);

export default app;
