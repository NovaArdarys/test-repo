import { db } from "@/db";
import { notifications } from "@/db/schemas/notification.schema";
import { InferSelectModel } from "drizzle-orm";
export type NotificationInputType = Omit<
  InferSelectModel<typeof notifications>,
  'id' | 'createdAt'
>;

export async function createNotification(data: NotificationInputType): Promise<NotificationInputType> {
  const [newItem] = await db.insert(notifications)
    .values({
      ...data,
    })
    .returning();
  return newItem;
}
