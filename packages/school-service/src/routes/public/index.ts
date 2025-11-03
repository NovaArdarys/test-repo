import { Hono } from 'hono';
import schools from './school.route';
import classRoom from './school.classroom.route';

const app = new Hono();

app.route('/schools', schools);
app.route('/school-classroom', classRoom);


export default app;
