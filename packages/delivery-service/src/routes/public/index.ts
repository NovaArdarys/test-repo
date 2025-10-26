import { Hono } from 'hono';
import deliveries from './delivery.route';
import deliverySchools from './delivery.schools.route';
import driverLocations from './driver.locations.route';

const app = new Hono();
app.route('/deliveries', deliveries);
app.route('/delivery-schools', deliverySchools);
app.route('/driver-locations', driverLocations);

export default app;
