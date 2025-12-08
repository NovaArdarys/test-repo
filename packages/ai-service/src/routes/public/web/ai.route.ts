import { analyzeData, analyzeDataOld } from "@/controllers/public/ai.controller";
import { Hono } from "hono";

const app = new Hono();

app.post("/detect", analyzeData);
app.post("/detect-old", analyzeDataOld);

export default app;