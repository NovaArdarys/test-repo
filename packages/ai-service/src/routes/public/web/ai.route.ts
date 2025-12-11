import { chatWithAIAgentHandler } from "@/controllers/public/ai.chat.controller";
import { analyzeData, analyzeDataOld } from "@/controllers/public/ai.controller";
import { checkAccessToken } from "@/middleware/auth.middleware";
import { Hono } from "hono";

const app = new Hono();
app.post("/detect", analyzeData);
app.post("/detect-old", analyzeDataOld);
app.use(checkAccessToken);
app.post("/chat", chatWithAIAgentHandler);

export default app;