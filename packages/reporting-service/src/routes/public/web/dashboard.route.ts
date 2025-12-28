import { Hono } from "hono";
import { getDashboardHandler } from "@/controllers/public/web/dashboard.controller";
import { checkAccessToken } from "@/middleware/auth.middleware";

const dashboardRoute = new Hono();
dashboardRoute.use(checkAccessToken);
dashboardRoute.get("/", getDashboardHandler);

export default dashboardRoute;
