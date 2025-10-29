import redis from '@/constants/redis';
import { detectFood } from '@/services/clients/ai.client.service';
import { insertAiLog } from '@/services/repositories/ai.service';
import { StorageCommittedType } from '@/validator/storage.validator';
import { Worker } from 'bullmq';

// Worker untuk job food detection
export const foodWorker = new Worker<StorageCommittedType>(
  'food-detect-queue',
  async (job) => {
    console.log(`🍳 [Worker] Processing job ${job.id}`);
    const start = performance.now();

    try {
      const result = await detectFood({
        image: "",
        labels: [{
          en: "",
          id: ""
        }]
      });
      const end = performance.now();
      const processingTime = (end - start) / 1000;

      // await insertAiLog({
      //   entityId: null,
      //   entityType: ENTITY_TYPES.FOOD,
      //   analysisType: ANALYSIS_TYPES.FOOD_DETECTION,
      //   sourceImageUrl: job.data.image,
      //   outputImageUrl: result?.output_image ?? null,
      //   processingTime: String(processingTime),
      //   threshold: result?.threshold ?? null,
      //   output: result,
      //   input: job.data,
      //   metadata: {
      //     jobId: job.id,
      //     queue: 'food-detect-queue',
      //     timestamp: new Date().toISOString()
      //   },
      // });

      console.log(`✅ [Worker] Job ${job.id} completed in ${processingTime.toFixed(2)}s`);
      return result;

    } catch (err: any) {
      console.error(`❌ [Worker] Job ${job.id} failed:`, err.message || err);
      // try {
      //   await insertAiLog({
      //     entityId: null,
      //     entityType: ENTITY_TYPES.FOOD,
      //     analysisType: ANALYSIS_TYPES.FOOD_DETECTION,
      //     sourceImageUrl: job.data.image,
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
  { connection: redis }
);

foodWorker.on('completed', (job) => {
  console.log(`🎉 [Worker] Job ${job.id} completed successfully`);
});

foodWorker.on('failed', (job, err) => {
  console.error(`💥 [Worker] Job ${job?.id} failed:`, err);
});
