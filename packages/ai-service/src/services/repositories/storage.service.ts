import { db } from "@/db";
import { storage } from "@/db/schemas";
import { aiAnalysisLogs } from "@/db/schemas/ai.log.schema";
import { inArray, eq, sql } from "drizzle-orm";

const storageSelect = {
  id: storage.id,
  entityId: storage.entityId,
  imageURL: storage.fileUrl,
  metadata: storage.meta,
  aiAnalysis: sql`
        COALESCE(
          json_agg(
            json_build_object(
              'analysisType', ${aiAnalysisLogs.analysisType},
              'input', ${aiAnalysisLogs.input},
              'output', ${aiAnalysisLogs.output},
              'processingTime', ${aiAnalysisLogs.processingTime},
              'threshold', ${aiAnalysisLogs.threshold}
            )
          ) FILTER (WHERE ${aiAnalysisLogs.id} IS NOT NULL),
          '[]'::json
        )
      `.as("aiAnalysis"),
};

export async function getStorageByEntityIds(entityIds: string[]) {
  if (!entityIds.length) return [];

  return db
    .select(storageSelect)
    .from(storage)
    .leftJoin(aiAnalysisLogs, eq(aiAnalysisLogs.storageId, storage.id))
    .where(inArray(storage.entityId, entityIds))
    .groupBy(storage.id);
}

export async function getStorageById(id: string) {
  const rows = await db
    .select(storageSelect)
    .from(storage)
    .leftJoin(aiAnalysisLogs, eq(aiAnalysisLogs.storageId, storage.id))
    .where(eq(storage.id, id))
    .groupBy(storage.id);

  return rows[0] || null;
}
