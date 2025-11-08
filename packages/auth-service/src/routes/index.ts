import { Hono } from 'hono';

import auth from '@/routes/auth.route';
import { generateOpenAPIDoc } from '@/utils/autoRoute';

const app = new Hono()
    .route('/auth', auth);

app.get("/openapi.json", async (c) => {
    const handler = await generateOpenAPIDoc(app, {
        title: "Auth API",
        version: "1.0.0",
        description: "Auto-generated API documentation for Auth",
        serverUrl: "http://localhost:3000",
    }, "/api");

    return handler(c, async () => { });
});

export default app;
