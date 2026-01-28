import { Hono } from "hono";
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

const notificationRoute = new Hono();

notificationRoute.get("/", listNotificationsHandler);
notificationRoute.get("/unread/count", getUnreadNotificationCountHandler);
notificationRoute.get("/recent", getRecentNotificationsHandler);
notificationRoute.get("/sent", getSentNotificationsHandler);
notificationRoute.get("/type/:type", getNotificationsByTypeHandler);
notificationRoute.get(
  "/entity/:entityType/:entityId",
  getNotificationsByEntityHandler
);
notificationRoute.get("/:id", getNotificationByIdHandler);
// notificationRoute.patch("/:id/read", markNotificationAsReadHandler);
// notificationRoute.patch("/read-all", markAllNotificationsAsReadHandler);
// notificationRoute.delete("/:id", deleteNotificationHandler);

export default notificationRoute;
