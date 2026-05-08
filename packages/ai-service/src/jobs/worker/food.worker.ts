import redis from '@/constants/redis';
import { Worker } from 'bullmq';
import { isEmpty } from 'lodash';
import z from 'zod';

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
import { processStatus } from '@/messaging/publishers/notification.publisher';
import { mapReport } from '@/services/mapper/daily.report.mapper';

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

      storageId = stepReport.storageId ?? null;

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

      const image = aiType !== "food" ? await compressImageToBase64(imageURL) : imageURL;
      let labels: { id: string; en: string; }[] = [];

      // if (aiType === "food") {
      //   labels = stepReport.dailyReport?.menuPlan?.menuFoodItem
      //     ?.flatMap((item) =>
      //       item.foodItem.ingredients?.map((ing) => ({
      //         id: ing.name?.toLowerCase()?.trim() || "",
      //         en: ing.nameEn?.toLowerCase()?.trim() || item.foodItem?.name?.toLowerCase()?.trim() || "",
      //       })) ?? []
      //     )
      //     .filter((l) => l.id && l.en) ?? [];

      //   if (!labels.length) {
      //     throw new Error("No valid food labels found for AI request.");
      //   }
      // }

      if (aiType === "food") {
        labels = stepReport.dailyReport?.menuPlan?.menuFoodItem
          ?.map((item) => ({
            id: item.foodItem?.name?.toLowerCase()?.trim() || "",
            en: item.foodItem?.nameEn?.toLowerCase()?.trim() || item.foodItem?.name?.toLowerCase()?.trim() || "",
          }))
          .filter((l) => l.id && l.en) ?? [];

        if (!labels.length) {
          throw new Error("No valid food labels found for AI request.");
        }
      }

      const stepMapped = mapReport(stepReport);

      const result = await detectAI(aiType, {
        analysis_type: aiType,
        image,
        image_url: imageURL,
        food_items: labels,
        labels,
      }, stepMapped);

      const end = performance.now();
      const processingTime = (end - start) / 1000;

      const aiResult = await insertAiLog({
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

      await job.updateData({
        ...job.data,
        dailyReportId: stepReport.dailyReportId,
        storageId: stepReport.storageId || "",
        stepKey: stepReport.step.stepKey,
        createdBy: stepReport.dailyReport.createdBy,
        aiResultId: aiResult?.[0].id
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

function buildBasePayload(job: any) {
  return {
    entityType: "AI_GENERATION" as const,
    entityId: job.data.id,
    kitchenId: job.data.entityId,
    beneficiaryId: undefined,
    relatedId: undefined,
    relatedType: undefined,
    date: new Date().toISOString().split("T")[0],
    jobId: String(job.id),
    userActorId: job?.data?.createdBy ?? "",
    userReceivedId: job?.data?.createdBy ?? "",
  };
}


foodWorker.on("active", async (job) => {
  console.log(`🚀 [Worker] Job ${job.id} started`);

  if (job.data.entityType === "kitchen") {
    const base = buildBasePayload(job);

    await processStatus.processing({
      ...base,
      variant: "information",
      progress: 10,
      step: "Sedang menganalisa",
      title: "Laporan Sedang Diproses",
      message:
        "Permintaan Anda sedang kami proses. Mohon tunggu beberapa saat.",
    });
  }
});

foodWorker.on("completed", async (job, result) => {
  console.log(`🎉 [Worker] Job ${job.id} completed successfully`);
  if (job.data.entityType === "kitchen") {
    const base = buildBasePayload(job);

    await processStatus.completed({
      ...base,
      variant: "information",
      progress: 100,
      step: "Selesai",
      title: "Laporan Siap",
      message: "Laporan Anda berhasil dibuat dan siap untuk ditinjau.",
      result,
    });
  }
});

foodWorker.on("failed", async (job, err) => {
  if (!job) return;

  if (job.data.entityType === "kitchen") {
    const base = buildBasePayload(job);

    await processStatus.failed({
      ...base,
      variant: "warning",
      step: "Gagal",
      title: "Pembuatan Laporan Gagal",
      message:
        "Terjadi kendala saat memproses laporan. Silakan coba kembali.",
      error: err?.message,
    });
  }
});

