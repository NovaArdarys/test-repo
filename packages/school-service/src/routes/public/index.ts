import { Hono } from 'hono';
import schools from './school.route';
import foodAllergies from './beneficiary.food.allergies.route';

const app = new Hono();

app.route('/schools', schools);
app.route('/food-allergies', foodAllergies);


export default app;
