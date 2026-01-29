import { db } from "@/db";
import { notifications } from "@/db/schemas/notification.schema";
import { buildPaginatedWhere } from "@/utils/pagination";
import {
  eq,
  and,
  desc,
  InferSelectModel,
  InferInsertModel,
  sql,
  gte,
} from "drizzle-orm";

export type Notification = InferSelectModel<typeof notifications>;

export type NotificationInput = Omit<
  InferInsertModel<typeof notifications>,
  "id" | "createdAt"
>;

export type PaginationOptions = {
  limit: number;
  offset: number;
};

export type NotificationFilterOptions = PaginationOptions & {
  isRead?: boolean;
};

export async function createNotification(
  data: NotificationInput
): Promise<Notification> {
  const [created] = await db
    .insert(notifications)
    .values(data)
    .returning();

  return created;
}

export async function createBulkNotifications(
  data: NotificationInput[]
): Promise<Notification[]> {
  if (data.length === 0) return [];

  return db.insert(notifications).values(data).returning();
}

export async function getNotificationsByUserId({
  userId,
  page,
  limit,
  isRead,
}: {
  userId: string;
  page: number;
  limit: number;
  isRead?: boolean;
}) {
  const { where, meta } = await buildPaginatedWhere({
    table: notifications,
    tableName: "notifications",
    base: {
      userReceivedId: userId,
      isRead: isRead !== undefined ? isRead : undefined,
    },
    extra: [],
    page,
    limit,
  });

  const data = await db.query.notifications.findMany({
    where: () => where,
    orderBy: (table) => sql`${table.createdAt} DESC`,
    offset: (page - 1) * limit,
    limit,
  });

  return {
    data,
    meta,
  };
}

export async function getUnreadNotificationsCount(
  userId: string
): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userReceivedId, userId),
        eq(notifications.isRead, false)
      )
    );

  return Number(result?.count ?? 0);
}

export async function getNotificationById(
  notificationId: string,
  userId: string
): Promise<Notification | null> {
  return (
    (await db.query.notifications.findFirst({
      where: (n, { eq, and }) =>
        and(
          eq(n.id, notificationId),
          eq(n.userReceivedId, userId)
        ),
    })) ?? null
  );
}

export async function getNotificationsByType(
  userId: string,
  type: string,
  options: PaginationOptions
): Promise<Notification[]> {
  return db.query.notifications.findMany({
    where: (n, { eq, and }) =>
      and(
        eq(n.userReceivedId, userId),
        eq(n.type, type)
      ),
    orderBy: (n, { desc }) => desc(n.createdAt),
    limit: options.limit,
    offset: options.offset,
  });
}

export async function getNotificationsByEntity(
  userId: string,
  entityType: string,
  entityId: string
): Promise<Notification[]> {
  return db.query.notifications.findMany({
    where: (n, { eq, and }) =>
      and(
        eq(n.userReceivedId, userId),
        sql`${n.payload}->>'entityType' = ${entityType}`,
        sql`${n.payload}->>'entityId' = ${entityId}`
      ),
    orderBy: (n, { desc }) => desc(n.createdAt),
  });
}

export async function getRecentNotifications(
  userId: string,
  hoursAgo: number
): Promise<Notification[]> {
  const cutoffDate = new Date(
    Date.now() - hoursAgo * 60 * 60 * 1000
  );

  return db.query.notifications.findMany({
    where: (n, { eq, and }) =>
      and(
        eq(n.userReceivedId, userId),
        gte(n.createdAt, cutoffDate)
      ),
    orderBy: (n, { desc }) => desc(n.createdAt),
  });
}

export async function getNotificationsSentByUser(
  userActorId: string,
  options: PaginationOptions
): Promise<Notification[]> {
  return db.query.notifications.findMany({
    where: (n, { eq }) =>
      eq(n.userActorId, userActorId),
    orderBy: (n, { desc }) => desc(n.createdAt),
    limit: options.limit,
    offset: options.offset,
  });
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<Notification | null> {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userReceivedId, userId)
      )
    )
    .returning();

  return updated ?? null;
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<number> {
  const updated = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userReceivedId, userId),
        eq(notifications.isRead, false)
      )
    )
    .returning();

  return updated.length;
}

export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const [deleted] = await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userReceivedId, userId)
      )
    )
    .returning();

  return !!deleted;
}
