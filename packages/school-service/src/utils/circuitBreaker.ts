import redis from "@/constants/redis";

export interface BreakerOptions {
  serviceName: string;
  failureThreshold?: number;     // default 3
  cooldownMillis?: number;       // default 10_000
  namespace?: string;            // default 'cb'
}

export async function callWithBreaker<T>(
  fn: () => Promise<T>,
  options: BreakerOptions
): Promise<T> {
  const {
    serviceName,
    failureThreshold = 3,
    cooldownMillis = 10_000,
    namespace = "cb",
  } = options;

  const failuresKey = `${namespace}:${serviceName}:fails`;
  const openKey = `${namespace}:${serviceName}:openUntil`;

  const now = Date.now();
  const openUntil = await redis.get(openKey);
  if (openUntil && now < Number(openUntil)) {
    throw new Error(`Circuit open for ${serviceName}`);
  }

  try {
    const result = await fn();
    await redis.del(failuresKey);
    return result;
  } catch (err) {
    const fails = await redis.incr(failuresKey);
    if (fails >= failureThreshold) {
      await redis.set(openKey, String(now + cooldownMillis), "PX", cooldownMillis);
    }
    throw err;
  }
}
