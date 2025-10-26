import redis from "@/constants/redis";

const RETRY_QUEUE = "retry:user-service:queue";

export async function enqueueRetry(payload: any) {
  await redis.rpush(RETRY_QUEUE, JSON.stringify(payload));
}

export async function processRetryQueue(fn: (data: any) => Promise<void>) {
  while (true) {
    const data = await redis.blpop(RETRY_QUEUE, 0);
    if (data) {
      const [, value] = data;
      try {
        await fn(JSON.parse(value));
      } catch (err: any) {
        console.error("[Retry] gagal lagi, push ulang →", err.message);
        await redis.rpush(RETRY_QUEUE, value);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }
}
