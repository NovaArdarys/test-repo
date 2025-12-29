import { Hono } from "hono";
import { getDashboardHandler, getDashboardPdfHandler } from "@/controllers/public/web/dashboard.controller";
import { checkAccessToken } from "@/middleware/auth.middleware";

const dashboardRoute = new Hono();
dashboardRoute.use(checkAccessToken);
dashboardRoute.get("/", getDashboardHandler);
dashboardRoute.get("/pdf", getDashboardPdfHandler);

export default dashboardRoute;
