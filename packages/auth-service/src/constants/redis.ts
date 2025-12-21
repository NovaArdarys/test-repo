import Redis from "ioredis";

export const redisShared = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: 6379,
  password: process.env.REDIS_PASSWORD || "password",
});

export const redisBull = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: 6379,
  password: process.env.REDIS_PASSWORD || "password",
  maxRetriesPerRequest: null,
});

redisShared.on("connect", () => {
  console.log("✅ Redis Shared connected");
});

redisShared.on("error", (err) => {
  console.error("❌ Redis Shared error", err);
});


redisBull.on("connect", () => {
  console.log("✅ Redis Bull connected");
});

redisBull.on("error", (err) => {
  console.error("❌ Redis Bull error", err);
});


export default redisShared;