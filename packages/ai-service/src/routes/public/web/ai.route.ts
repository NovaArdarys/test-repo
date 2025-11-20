import { analyzeData } from "@/controllers/public/ai.controller";
import { Hono } from "hono";

const app = new Hono();

app.post("/detect", analyzeData);

export default app;