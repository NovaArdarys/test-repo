import redis from "@/constants/redis";

const RETRY_QUEUE = "retry:user-service:queue";

export interface RetryPayload {
  id: string;
  data: any;
  attempts: number;
  maxAttempts: number;
  backoffMs: number;
}

export async function enqueueRetry(payload: Omit<RetryPayload, "attempts">) {
  const job: RetryPayload = {
    ...payload,
    attempts: 0,
  };
  await redis.rpush(RETRY_QUEUE, JSON.stringify(job));
}

export async function processRetryQueue(
  fn: (data: any) => Promise<void>,
  opts: { stopSignal?: () => boolean; } = {}
) {
  console.log("[Retry] Worker started...");

  while (!(opts.stopSignal && opts.stopSignal())) {
    const data = await redis.blpop(RETRY_QUEUE, 0);
    if (!data) continue;

    const [, value] = data;
    let job: RetryPayload;

    try {
      job = JSON.parse(value);
    } catch (err) {
      console.error("[Retry] JSON parse error:", value, err);
      continue;
    }

    try {
      await fn(job.data);
      console.log(`[Retry] Success job ${job.id}`);
    } catch (err: any) {
      job.attempts += 1;

      if (job.attempts >= job.maxAttempts) {
        console.error(`[Retry] Job ${job.id} failed permanently → move to dead-letter`, err.message);
        await redis.rpush(`${RETRY_QUEUE}:dead`, JSON.stringify(job));
      } else {
        const delay = job.backoffMs * job.attempts; // exponential backoff
        console.warn(`[Retry] Job ${job.id} failed (attempt ${job.attempts}), retry in ${delay}ms`);

        setTimeout(async () => {
          await redis.rpush(RETRY_QUEUE, JSON.stringify(job));
        }, delay);
      }
    }
  }
}
