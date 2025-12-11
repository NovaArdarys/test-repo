// src/routes/notification.route.ts
import { Hono } from "hono";
import { sseController } from "@/controllers/public/notification.controller";

const notificationRoute = new Hono();

notificationRoute.get("/sse", sseController);
notificationRoute.get("/sse-test", (res) => res.json({ message: "ok" }));

export default notificationRoute;
