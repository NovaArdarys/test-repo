import { db } from "@/db";
import { aiAnalysisLogs } from "@/db/schemas/ai.log.schema";
import { analysisTypeEnum, entityTypeEnum } from "@/db/schemas";
import type { InferInsertModel } from "drizzle-orm";

export type AnalysisType = (typeof analysisTypeEnum.enumValues)[number];
export type EntityType = (typeof entityTypeEnum.enumValues)[number];

export type AiAnalysisLogInsert = InferInsertModel<typeof aiAnalysisLogs>;

export interface InsertAiLogParams extends Partial<AiAnalysisLogInsert> {
  analysisType: AnalysisType;
  entityType: EntityType;
  entityId: string;
}


export async function insertAiLog(params: InsertAiLogParams) {
  const {
    entityId,
    entityType,
    analysisType,
    sourceImageUrl,
    outputImageUrl,
    processingTime,
    threshold,
    output,
    input,
    metadata
  } = params;

  return await db.insert(aiAnalysisLogs).values({
    entityId,
    entityType: entityType ?? "other",
    analysisType: analysisType ?? "food-detection",
    sourceImageUrl: sourceImageUrl ?? null,
    outputImageUrl: outputImageUrl ?? null,
    processingTime: processingTime ?? null,
    threshold: threshold ?? null,
    output,
    input,
    metadata: metadata ?? {},
    createdAt: new Date()
  });
}
