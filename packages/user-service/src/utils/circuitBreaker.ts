import redis from "@/constants/redis";

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT = 15000;

export async function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>
): Promise<T> {
  const stateKey = `cb:${serviceName}:state`;
  const failKey = `cb:${serviceName}:failCount`;

  const state = (await redis.get(stateKey)) || "closed";

  if (state === "open") {
    throw new Error(`Circuit breaker OPEN for ${serviceName}`);
  }

  try {
    const result = await fn();

    await redis.del(failKey);
    await redis.set(stateKey, "closed");
    return result;
  } catch (err) {
    const fails = await redis.incr(failKey);

    if (fails >= FAILURE_THRESHOLD) {
      await redis.set(stateKey, "open", "PX", RESET_TIMEOUT);
    }
    throw err;
  }
}