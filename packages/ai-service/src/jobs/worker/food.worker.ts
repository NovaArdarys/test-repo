import redis from '@/constants/redis';
import { db } from '@/db';
import { detectAI, getAITypeFromStepOrder } from '@/services/clients/ai.client.service';
import { insertAiLog } from '@/services/repositories/ai.service';
import { compressImageToBase64 } from '@/utils/imageCompress';
import { StorageCommittedType } from '@/validator/storage.validator';
import { Worker } from 'bullmq';

// Worker untuk job food detection
export const foodWorker = new Worker<StorageCommittedType>(
  'food-detect-queue',
  async (job) => {
    console.log(`🍳 [Worker] Processing job ${job.id}`);
    const start = performance.now();

    try {

      const stepReportData = await db.query.stepReports.findFirst({
        where: (sr, { eq }) => eq(sr.id, job.data.entityId),
        columns: {
          id: true,
          stepId: true,
          dailyReportId: true,
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
                          nameEn: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          step: {
            columns: {
              stepKey: true,
              stepName: true,
              stepOrder: true
            }
          }
        }
      });

      if (!stepReportData?.step) {
        throw new Error("Step report not found or missing step data.");
      }

      const aiType = getAITypeFromStepOrder(stepReportData.step.stepOrder);
      if (!aiType) {
        return null;
      }

      const image = await compressImageToBase64(job.data.url);

      const end = performance.now();
      const processingTime = (end - start) / 1000;
      const labels =
        aiType === "food"
          ? stepReportData.dailyReport.menuPlan.menuFoodItem
            .map((item) => ({
              id: item.foodItem?.name?.trim() || "",
              en: item.foodItem?.nameEn?.trim() || item.foodItem?.name?.trim() || "",
            }))
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
      console.log({
        entityId: job.data.entityId,
        entityType: job.data.entityType,
        analysisType: aiType === "food" ? "food_detection" : aiType === "cleanliness" ? "cleanliness" : "mealbox_count",
        sourceImageUrl: job.data.url,
        outputImageUrl: result?.output_image ?? null,
        processingTime: String(processingTime),
        threshold: result?.threshold ?? null,
        output: result,
        input: job.data,
        metadata: {
          jobId: job.id,
          queue: 'food-detect-queue',
          timestamp: new Date().toISOString()
        }
      }, "-------- 🔥🔥🔥🔥 ---------");


      await insertAiLog({
        entityId: job.data.entityId,
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

    } catch (err: any) {
      try {
        await insertAiLog({
          entityId: job.data.entityId,
          analysisType: "mealbox_count",
          sourceImageUrl: job.data.url,
          outputImageUrl: null,
          processingTime: "0",
          threshold: null,
          output: { error: err?.message || 'AI failed' },
          input: job.data,
          metadata: { jobId: job.id, queue: 'food-detect-queue', status: 'failed' },
        });
      } catch (dbErr) {
        console.error(`⚠️ [Worker] Failed to insert error log:`, dbErr);
      }

      throw err;
    }
  },
  { connection: redis }
);

foodWorker.on('completed', (job) => {
  console.log(`🎉 [Worker] Job ${job.id} completed successfully`);
});

foodWorker.on('failed', (job, err) => {
  console.error(`💥 [Worker] Job ${job?.id} failed:`, err);
});
