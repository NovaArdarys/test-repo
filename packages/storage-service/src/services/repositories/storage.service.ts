import { db } from "@/db";
import { entityTypeEnum } from "@/db/schemas";
import { storage } from "@/db/schemas/storage.schema";
import { minioClient } from "@/utils/minioClient";
import { eq, InferSelectModel, sql } from "drizzle-orm";

export type StorageRecord = InferSelectModel<typeof storage>;
export type EntityType = keyof typeof entityTypeEnum;

export interface StorageCreatePayload {
  fileName: string;
  path: string;
  fileUrl: string;
  mimeType?: string;
  size?: string;
  tmpId?: string;
  entityType?: EntityType;
  entityId?: string;
  createdBy?: string;
  meta?: Record<string, any>;
}

export async function saveStorageRecord(data: StorageCreatePayload): Promise<StorageRecord> {
  try {
    const [record] = await db.insert(storage)
      .values({
        ...data,
        entityType: data.entityType as any,
        entityId: data?.entityId ?? null,
        createdAt: new Date(),
        createdBy: data.createdBy ?? null,
      })
      // .onConflictDoUpdate({
      //   target: [storage.entityType, storage.entityId],
      //   set: {
      //     fileName: data.fileName,
      //     fileUrl: data.fileUrl,
      //     path: data.path,
      //   },
      // })
      .returning();

    return record;
  } catch (err) {
    console.error("[STORAGE SERVICE] Failed to save storage record:", err);
    throw err;
  }
}

export async function linkStorageToEntity(storageId: string, entityId: string, path: string, fileUrl: string, fileName: string, entityType: EntityType) {
  try {
    await db.update(storage)
      .set({ entityType: entityType as any, entityId, path, fileUrl, fileName })
      .where(sql`${storage.id} = ${storageId}`);
  } catch (err) {
    console.error("[STORAGE SERVICE] Failed to link storage to entity:", err);
    throw err;
  }
}

export async function getByStorageId(storageId: string) {
  const result = await db
    .select()
    .from(storage)
    .where(eq(storage.id, storageId))
    .limit(1);

  return result[0] ?? null;
}