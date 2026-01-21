// src/routes/notification.route.ts
import { Hono } from "hono";
import { sendSseToChannel, sseController } from "@/controllers/public/notification.controller";

const notificationRoute = new Hono();

notificationRoute.get("/sse", sseController);
notificationRoute.get("/sse-test/:key", async (c) => {
  const channelKey = c.req.param("key");
  await sendSseToChannel(`kitchen:${channelKey}`, "TEST_DATA", { message: "hello" });

  return c.json({ message: "ok" });
}
);

export default notificationRoute;
