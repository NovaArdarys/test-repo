import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { checkAccessToken } from "@/middleware/auth.middleware";

import {
  listNotificationsHandler,
  getUnreadNotificationCountHandler,
  getNotificationByIdHandler,
  getNotificationsByTypeHandler,
  getNotificationsByEntityHandler,
  getRecentNotificationsHandler,
  getSentNotificationsHandler,
  markNotificationAsReadHandler,
  markAllNotificationsAsReadHandler,
  deleteNotificationHandler,
} from "@/controllers/public/notification.controller";

import { idParamSchema } from "@/validator/global.validator";
import {
  listNotificationQuerySchema,
  recentNotificationQuerySchema,
  typeParamSchema,
  entityParamSchema,
} from "@/validator/notification.validator";
import { sendSseToChannel, sseController } from "@/controllers/public/notification.sse.controller";

const app = new Hono();
app.get("/sse", sseController);
app.get("/sse-test/:key", async (c) => {
  const channelKey = c.req.param("key");
  await sendSseToChannel(`kitchen:${channelKey}`, "TEST_DATA", { message: "hello" });

  return c.json({ message: "ok" });
}
);
app.use(checkAccessToken);
app.get(
  "/",
  validate(listNotificationQuerySchema, "query"),
  listNotificationsHandler
);
app.get("/unread/count", getUnreadNotificationCountHandler);
app.get(
  "/recent",
  validate(recentNotificationQuerySchema, "query"),
  getRecentNotificationsHandler
);
app.get(
  "/sent",
  validate(listNotificationQuerySchema, "query"),
  getSentNotificationsHandler
);
app.get(
  "/type/:type",
  validate(typeParamSchema, "param"),
  validate(listNotificationQuerySchema, "query"),
  getNotificationsByTypeHandler
);
app.get(
  "/entity/:entityType/:entityId",
  validate(entityParamSchema, "param"),
  getNotificationsByEntityHandler
);
app.get(
  "/:id",
  validate(idParamSchema, "param"),
  getNotificationByIdHandler
);
app.patch(
  "/:id/read",
  validate(idParamSchema, "param"),
  markNotificationAsReadHandler
);
app.patch("/read-all", markAllNotificationsAsReadHandler);
app.delete(
  "/:id",
  validate(idParamSchema, "param"),
  deleteNotificationHandler
);

export default app;
