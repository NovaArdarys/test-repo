import redis from '@/constants/redis';
import { db } from '@/db';
import { AIAnalysisType, detectAI, getAITypeFromStepOrder } from '@/services/clients/ai.client.service';
import { insertAiLog, getStepReportDetail } from '@/services/repositories/ai.service';
import { compressImageToBase64 } from '@/utils/imageCompress';
import { StorageCommittedType } from '@/validator/storage.validator';
import { Worker } from 'bullmq';

// Worker untuk job food detection
export const foodWorker = new Worker<StorageCommittedType>(
  'food-detect-queue',
  async (job) => {
    console.log(`🍳 [Worker] Processing job ${job.id} - ${JSON.stringify(job.data)}`);
    const start = performance.now();

    try {

      if (job?.data?.entityId) {

        const entityId = job?.data?.entityId;
        const stepReport = await getStepReportDetail(entityId);

        if (!stepReport?.step) {
          throw new Error("Step report not found or missing step data.");
        }

        const aiType = getAITypeFromStepOrder(
          stepReport.step.stepOrder,
          job.data.entityType,
          stepReport.step.analysisType ?? undefined
        );

        if (!aiType) {
          return null;
        }

        const image = await compressImageToBase64(job.data.url);

        const end = performance.now();
        const processingTime = (end - start) / 1000;
        const labels =
          aiType === "food"
            ? stepReport?.dailyReport?.menuPlan?.menuFoodItem
              .flatMap((item) =>
                (item.foodItem.ingredients || []).map((ing) => ({
                  id: ing.name?.trim() || "",
                  en: ing.nameEn?.trim() || item.foodItem?.name?.trim() || "",
                }))
              )
              .filter((l) => l.id && l.en)
            : [];


        if (aiType === "food" && (!labels || labels.length === 0)) {
          throw new Error("No valid food labels found for AI request.");
        }

        const result = await detectAI(aiType, {
          image,
          labels: labels.map(l => ({
            id: l.id || "",
            en: l.en || "",
          })),
        });

        await insertAiLog({
          entityId: job?.data?.entityId ?? null,
          analysisType:
            aiType === "food"
              ? "food_detection"
              : aiType === "cleanliness"
                ? "cleanliness"
                : "mealbox_count",
          sourceImageUrl: job.data.url,
          outputImageUrl: result?.output_image ?? null,
          processingTime: String(processingTime),
          threshold: result?.threshold ?? null,
          output: result,
          input: {
            labels: labels.map(l => ({
              id: l.id || "",
              en: l.en || "",
            })),
          },
          metadata: {
            aiURL: `/detect/${aiType}`,
            jobId: job.id,
            queue: "food-detect-queue",
            timestamp: new Date().toISOString(),
          },
        });

        console.log(`✅ [Worker] Job ${job.id} completed in ${processingTime.toFixed(2)}s`);
        return result;
      } else {

        const image = await compressImageToBase64(job.data.url);

        const end = performance.now();
        const processingTime = (end - start) / 1000;


        const result = await detectAI(job.data.entityType === "profile" ? "people" : "food", {
          image,
          labels: [
            {
              id: "",
              en: "",
            }
          ],
        });

        await insertAiLog({
          entityId: job?.data?.entityId ?? null,
          analysisType:
            job.data.entityType === "profile"
              ? "food_detection"
              : job.data.entityType === "other"
                ? "cleanliness"
                : "mealbox_count",
          sourceImageUrl: job.data.url,
          outputImageUrl: result?.output_image ?? null,
          processingTime: String(processingTime),
          threshold: result?.threshold ?? null,
          output: result,
          input: {
            labels: [{
              id: "",
              en: "",
            }],
          },
          metadata: {
            aiURL: `/detect/${job.data.entityType === "profile" ? "people" : "food"}`,
            jobId: job.id,
            queue: "food-detect-queue",
            timestamp: new Date().toISOString(),
          },
        });

      }


    } catch (err: any) {
      // try {
      //   await insertAiLog({
      //     entityId: job?.data?.entityId || null,
      //     analysisType: "mealbox_count",
      //     sourceImageUrl: job.data.url,
      //     outputImageUrl: null,
      //     processingTime: "0",
      //     threshold: null,
      //     output: { error: err?.message || 'AI failed' },
      //     input: job.data,
      //     metadata: { jobId: job.id, queue: 'food-detect-queue', status: 'failed' },
      //   });
      // } catch (dbErr) {
      //   console.error(`⚠️ [Worker] Failed to insert error log:`, dbErr);
      // }

      throw err;
    }
  },
  {
    connection: redis,
    lockDuration: 120000,   // ← DI SINI
    concurrency: 2,         // ← DI SINI
    maxStalledCount: 5,
    stalledInterval: 30000,
  }
);

foodWorker.on('completed', (job) => {
  console.log(`🎉 [Worker] Job ${job.id} completed successfully`);
});

foodWorker.on('failed', (job, err) => {
  console.error(`💥 [Worker] Job ${job?.id} failed:`, err);
});
