import { db } from "@/db";
import { aiAnalysisLogs } from "@/db/schemas/ai.log.schema";
import { analysisTypeEnum, entityTypeEnum } from "@/db/schemas";
import type { InferInsertModel } from "drizzle-orm";

export type AnalysisType = (typeof analysisTypeEnum.enumValues)[number];

export type AiAnalysisLogInsert = InferInsertModel<typeof aiAnalysisLogs>;

export interface InsertAiLogParams extends Partial<AiAnalysisLogInsert> {
  analysisType: AnalysisType;
  entityId: string | null;
}

export async function insertAiLog(params: InsertAiLogParams) {
  const {
    entityId,
    analysisType,
    sourceImageUrl,
    storageId,
    outputImageUrl,
    processingTime,
    threshold,
    output,
    input,
    metadata
  } = params;

  return await db.insert(aiAnalysisLogs).values({
    entityId,
    analysisType,
    sourceImageUrl: sourceImageUrl ?? null,
    outputImageUrl: outputImageUrl ?? null,
    processingTime: processingTime ?? null,
    threshold: threshold ?? null,
    output,
    input,
    storageId,
    metadata: metadata ?? {},
    createdAt: new Date()
  }).onConflictDoUpdate({
    target: [aiAnalysisLogs.entityId, aiAnalysisLogs.analysisType, aiAnalysisLogs.storageId],
    set: {
      sourceImageUrl: sourceImageUrl ?? null,
      outputImageUrl: outputImageUrl ?? null,
      processingTime: processingTime ?? null,
      threshold: threshold ?? null,
      output,
      input,
      storageId,
      metadata: metadata ?? {},
    },
  }).returning();
}

export async function getStepReportDetail(entityId?: string) {
  if (!entityId) return null;

  const result = await db.query.stepReports.findFirst({
    where: (sr, { eq }) => eq(sr.id, entityId),
    columns: {
      id: true,
      stepId: true,
      dailyReportId: true,
      subDomain: true,
      imageURL: true,
      storageId: true
    },
    with: {
      dailyReport: {
        with: {
          menuPlan: {
            with: {
              menuFoodItem: {
                with: {
                  foodItem: {
                    columns: {
                      name: true,
                      nameEn: true,
                      ingredients: true
                    },
                  },
                },
              },
            },
          },
        },
      },
      step: {
        columns: {
          stepKey: true,
          stepName: true,
          stepOrder: true,
          entityType: true,
          subDomains: true,
          analysisType: true
        },
      },
    },
  });

  return result;
}