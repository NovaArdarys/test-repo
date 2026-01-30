import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import * as notificationService from "@/services/repositories/notification.service";
import z from "zod";
import { listNotificationQuerySchema } from "@/validator/notification.validator";

export const listNotificationsHandler = catchAsync(async (c: Context) => {
  const userId = c.get("userId") as string;
  const query = await c.get("validatedData").query as z.infer<typeof listNotificationQuerySchema>;

  const data =
    await notificationService.getNotificationsByUserId({
      userId,
      isRead: query?.isRead ?? false,
      limit: query?.limit ?? 10,
      page: query.page
    });

  return c.json({ data: data.data, meta: data.meta });
});

export const getUnreadNotificationCountHandler = catchAsync(async (c) => {
  const userId = c.get("userId") as string;
  const count =
    await notificationService.getUnreadNotificationsCount(userId);

  return c.json({ data: { count } });
});

export const getNotificationByIdHandler = catchAsync(async (c) => {
  const userId = c.get("userId") as string;
  const { id } = c.req.valid("param");

  const notification =
    await notificationService.getNotificationById(id, userId);

  if (!notification) {
    return c.json({ message: "Notification not found" }, 404);
  }

  return c.json({ data: notification });
});

export const getNotificationsByTypeHandler = catchAsync(async (c) => {
  const userId = c.get("userId") as string;
  const { type } = c.req.valid("param");
  const query = c.req.valid("query");

  const notifications =
    await notificationService.getNotificationsByType(userId, type, {
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

  return c.json({ data: notifications });
});

export const getNotificationsByEntityHandler = catchAsync(async (c) => {
  const userId = c.get("userId") as string;
  const { entityType, entityId } = c.req.valid("param");

  const notifications =
    await notificationService.getNotificationsByEntity(
      userId,
      entityType,
      entityId
    );

  return c.json({ data: notifications });
});

export const getRecentNotificationsHandler = catchAsync(async (c) => {
  const userId = c.get("userId") as string;
  const { hoursAgo } = c.req.valid("query");

  const notifications =
    await notificationService.getRecentNotifications(userId, hoursAgo);

  return c.json({ data: notifications });
});

export const getSentNotificationsHandler = catchAsync(async (c) => {
  const userActorId = c.get("userId") as string;
  const query = c.req.valid("query");

  const notifications =
    await notificationService.getNotificationsSentByUser(userActorId, {
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

  return c.json({ data: notifications });
});

export const markNotificationAsReadHandler = catchAsync(async (c) => {
  const userId = c.get("userId") as string;
  const { id } = c.req.valid("param");

  const updated =
    await notificationService.markNotificationAsRead(id, userId);

  if (!updated) {
    return c.json({ message: "Notification not found" }, 404);
  }

  return c.json({
    data: updated,
    message: "Notification marked as read",
  });
});

export const markAllNotificationsAsReadHandler = catchAsync(async (c) => {
  const userId = c.get("userId") as string;
  const count =
    await notificationService.markAllNotificationsAsRead(userId);

  return c.json({
    data: { count },
    message: "All notifications marked as read",
  });
});

export const deleteNotificationHandler = catchAsync(async (c) => {
  const userId = c.get("userId") as string;
  const { id } = c.req.valid("param");

  const success =
    await notificationService.deleteNotification(id, userId);

  if (!success) {
    return c.json({ message: "Notification not found" }, 404);
  }

  return c.json({ message: "Notification deleted" });
});
