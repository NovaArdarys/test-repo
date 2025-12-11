import redis from '@/constants/redis';
import { Worker } from 'bullmq';
import { isEmpty } from 'lodash';
import z from 'zod';

import { db } from '@/db';
import { stepCommittedSchema } from '@/validator/step.validator';
import { compressImageToBase64 } from '@/utils/imageCompress';

import {
  insertAiLog,
  getStepReportDetail,
} from '@/services/repositories/ai.service';

import {
  detectAI,
  getAITypeFromStepOrder,
} from '@/services/clients/ai.client.service';
import { aiStatus } from '@/messaging/publishers/notification.publisher';

const SKIPPABLE_ERRORS = ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT"];

export const foodWorker = new Worker<z.infer<typeof stepCommittedSchema>>(
  "food-detect-queue",
  async (job) => {
    console.log(`🍳 [Worker] Processing job ${job.id}`);
    const start = performance.now();

    let analysisType:
      | "cleanliness"
      | "food_authenticity"
      | "people_count"
      | "mealbox_count"
      | "food_detection"
      | "apd_check" = "cleanliness";

    let storageId: string | null = null;
    let imageURL = "";

    try {
      if (!job?.data?.id) {
        console.warn(`⚠️ Job ${job.id} tidak memiliki stepReport id`);
        return null;
      }

      const stepReport = await getStepReportDetail(job.data.id);

      if (isEmpty(stepReport)) {
        console.warn(`⚠️ Step report ${job.data.id} tidak ditemukan`);
        return null;
      }

      await job.updateData({
        ...job.data,
        dailyReportId: stepReport.dailyReportId,
        storageId: stepReport.storageId || "",
        stepKey: stepReport.step.stepKey
      });

      storageId = stepReport.storageId ?? null;

      await aiStatus.processing({
        channel: `dailyReport:${stepReport.dailyReportId}`,
        status: "PROCESSING",
        stepId: stepReport.id,
        storageId: stepReport.storageId ?? "",
        dailyReportId: stepReport.dailyReportId,
        stepKey: stepReport.step.stepKey,
        jobId: String(job.id),
      });

      if (stepReport.step?.analysisType) {
        analysisType = stepReport.step.analysisType;
      }

      const aiType = getAITypeFromStepOrder(
        stepReport.step.stepOrder,
        stepReport.step.entityType,
        stepReport.step.analysisType ?? undefined
      );

      if (!aiType) {
        console.warn(`⚠️ Tidak ada AI type untuk step ${stepReport.step.stepName}`);
        return null;
      }

      if (!stepReport.imageURL) {
        console.warn(`⚠️ Tidak ada imageURL pada stepReport`);
        return null;
      }

      imageURL = stepReport.imageURL;
      console.log(stepReport.imageURL, "=======stepReport.imageURL====== 🅿️");

      const image = await compressImageToBase64(imageURL);
      let labels: { id: string; en: string; }[] = [];

      if (aiType === "food") {
        labels = stepReport.dailyReport?.menuPlan?.menuFoodItem
          ?.flatMap((item) =>
            item.foodItem.ingredients?.map((ing) => ({
              id: ing.name?.toLowerCase()?.trim() || "",
              en: ing.nameEn?.toLowerCase()?.trim() || item.foodItem?.name?.toLowerCase()?.trim() || "",
            })) ?? []
          )
          .filter((l) => l.id && l.en) ?? [];

        if (!labels.length) {
          throw new Error("No valid food labels found for AI request.");
        }
      }

      const result = await detectAI(aiType, {
        image,
        labels,
      });

      const end = performance.now();
      const processingTime = (end - start) / 1000;


      await insertAiLog({
        entityId: job.data.id ?? null,
        storageId,
        analysisType,
        sourceImageUrl: imageURL,
        outputImageUrl: result?.output_image ?? null,
        processingTime: String(processingTime),
        threshold: result?.threshold ?? null,
        output: result,
        input: { labels },
        metadata: {
          aiURL: `/detect/${aiType}`,
          jobId: job.id,
          queue: "food-detect-queue",
          timestamp: new Date().toISOString(),
        },
      });

      console.log(
        `✅ [Worker] Job ${job.id} completed in ${processingTime.toFixed(2)}s`
      );

      return result;

    } catch (err: any) {
      const end = performance.now();
      const processingTime = (end - start) / 1000;

      if (SKIPPABLE_ERRORS.includes(err.code)) {
        console.warn(`⚠️ AI server unreachable (${err.code}), job skipped`);
        return null;
      }

      try {
        await insertAiLog({
          entityId: job.data.id ?? null,
          analysisType,
          sourceImageUrl: imageURL,
          storageId,
          outputImageUrl: null,
          processingTime: String(processingTime),
          threshold: null,
          output: { error: err?.message || "AI failed" },
          input: {
            labels: [{ id: "", en: "" }],
          },
          metadata: {
            aiURL: `/detect/${job.data.entityType === "profile" ? "people" : "food"
              }`,
            jobId: job.id,
            queue: "food-detect-queue",
            timestamp: new Date().toISOString(),
          },
        });
      } catch (dbErr) {
        console.error(`⚠️ [Worker] Failed to insert error log:`, dbErr);
      }

      console.error(`💥 [Worker] Job ${job.id} failed`, err);
      throw err;
    }
  },
  {
    connection: redis,
    lockDuration: 120000,
    concurrency: 2,
    maxStalledCount: 5,
    stalledInterval: 30000,
  }
);

foodWorker.on("completed", async (job, result) => {
  console.log(`🎉 [Worker] Job ${job.id} completed successfully`);

  await aiStatus.done({
    channel: `dailyReport:${job.data.dailyReportId}`,
    status: "DONE",
    stepId: job.data.id,
    storageId: job.data.storageId ?? "",
    dailyReportId: job.data.dailyReportId || "",
    stepKey: job.data.stepKey,
    jobId: String(job.id),
    result,
  });
});

foodWorker.on("failed", async (job, err) => {
  if (!job) {
    console.error(`💥 [Worker] Job failed:`, err);
    return;
  }

  console.error(`💥 [Worker] Job ${job.id} failed:`, err);

  await aiStatus.failed({
    channel: `dailyReport:${job.data.dailyReportId}`,
    status: "FAILED",
    stepId: job.data.id,
    storageId: job.data.storageId ?? "",
    dailyReportId: job.data.dailyReportId || "",
    stepKey: job.data.stepKey,
    jobId: String(job.id),
    error: err?.message ?? "Unknown error"
  });
});