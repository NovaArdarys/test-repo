import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  createNotification,
  getNotificationsByUserId,
  getUnreadNotificationsCount,
  getNotificationById,
  getNotificationsByType,
  getNotificationsByEntity,
  getRecentNotifications,
  getNotificationsSentByUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/services/repositories/notification.service";

export const listNotificationsHandler = catchAsync(async (c: Context) => {
  const userId = c.get("userId") as string;
  const query = c.req.query();

  const isRead =
    query.isRead !== undefined ? query.isRead === "true" : undefined;

  const limit = Number(query.limit ?? 50);
  const offset = Number(query.offset ?? 0);

  const notifications = await getNotificationsByUserId(userId, {
    isRead,
    limit,
    offset,
  });

  return c.json({ data: notifications }, 200);
});


export const getUnreadNotificationCountHandler = catchAsync(
  async (c: Context) => {
    const userId = c.get("userId") as string;

    const count = await getUnreadNotificationsCount(userId);

    return c.json({ data: { count } }, 200);
  }
);

export const getNotificationByIdHandler = catchAsync(async (c: Context) => {
  const userId = c.get("userId") as string;
  const { id } = c.req.param();

  const notification = await getNotificationById(id, userId);

  if (!notification) {
    return c.json({ message: "Notification not found" }, 404);
  }

  return c.json({ data: notification }, 200);
});

export const getNotificationsByTypeHandler = catchAsync(
  async (c: Context) => {
    const userId = c.get("userId") as string;
    const { type } = c.req.param();
    const query = c.req.query();

    const limit = Number(query.limit ?? 50);
    const offset = Number(query.offset ?? 0);

    const notifications = await getNotificationsByType(userId, type, {
      limit,
      offset,
    });

    return c.json({ data: notifications }, 200);
  }
);

export const getNotificationsByEntityHandler = catchAsync(
  async (c: Context) => {
    const userId = c.get("userId") as string;
    const { entityType, entityId } = c.req.param();

    const notifications = await getNotificationsByEntity(
      userId,
      entityType,
      entityId
    );

    return c.json({ data: notifications }, 200);
  }
);

export const getRecentNotificationsHandler = catchAsync(
  async (c: Context) => {
    const userId = c.get("userId") as string;
    const query = c.req.query();

    const hoursAgo = Number(query.hoursAgo ?? 24);

    const notifications = await getRecentNotifications(userId, hoursAgo);

    return c.json({ data: notifications }, 200);
  }
);

export const getSentNotificationsHandler = catchAsync(
  async (c: Context) => {
    const userActorId = c.get("userId") as string;
    const query = c.req.query();

    const limit = Number(query.limit ?? 50);
    const offset = Number(query.offset ?? 0);

    const notifications = await getNotificationsSentByUser(userActorId, {
      limit,
      offset,
    });

    return c.json({ data: notifications }, 200);
  }
);

export const markNotificationAsReadHandler = catchAsync(
  async (c: Context) => {
    const userId = c.get("userId") as string;
    const { id } = c.req.param();

    const updated = await markNotificationAsRead(id, userId);

    if (!updated) {
      return c.json({ message: "Notification not found" }, 404);
    }

    return c.json(
      { data: updated, message: "Notification marked as read" },
      200
    );
  }
);

export const markAllNotificationsAsReadHandler = catchAsync(
  async (c: Context) => {
    const userId = c.get("userId") as string;

    const count = await markAllNotificationsAsRead(userId);

    return c.json(
      {
        data: { count },
        message: "All notifications marked as read",
      },
      200
    );
  }
);

export const deleteNotificationHandler = catchAsync(
  async (c: Context) => {
    const userId = c.get("userId") as string;
    const { id } = c.req.param();

    const success = await deleteNotification(id, userId);

    if (!success) {
      return c.json({ message: "Notification not found" }, 404);
    }

    return c.json({ message: "Notification deleted" }, 200);
  }
);
