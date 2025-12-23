import { Hono } from "hono";
import { getDashboardHandler } from "@/controllers/public/web/dashboard.controller";

const dashboardRoute = new Hono();

dashboardRoute.get("/", getDashboardHandler);

export default dashboardRoute;
