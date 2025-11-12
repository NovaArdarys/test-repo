import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: 6379,
  password: process.env.REDIS_PASSWORD || "password",
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error", err);
});

export default redis;
