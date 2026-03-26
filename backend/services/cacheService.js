import { createClient } from "redis";

let redisClient = null;
let redisReady = false;
let redisInitAttempted = false;

const shouldEnableRedis = () => {
  if (String(process.env.REDIS_ENABLED || "").toLowerCase() === "false") {
    return false;
  }

  return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
};

const resolveRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const host = process.env.REDIS_HOST;
  if (!host) {
    return null;
  }

  const port = process.env.REDIS_PORT || "6379";
  const password = process.env.REDIS_PASSWORD;
  const db = process.env.REDIS_DB;

  const credentials = password ? `:${encodeURIComponent(password)}@` : "";
  const dbPath = db ? `/${db}` : "";
  return `redis://${credentials}${host}:${port}${dbPath}`;
};

export const connectRedis = async () => {
  if (redisInitAttempted) {
    return redisClient;
  }

  redisInitAttempted = true;

  if (!shouldEnableRedis()) {
    console.log("Redis cache disabled. Set REDIS_URL or REDIS_HOST to enable it.");
    return null;
  }

  const url = resolveRedisUrl();
  if (!url) {
    console.warn("Redis cache configuration missing. Skipping Redis connection.");
    return null;
  }

  redisClient = createClient({ url });

  redisClient.on("error", (error) => {
    redisReady = false;
    console.error("Redis client error:", error.message);
  });

  redisClient.on("ready", () => {
    redisReady = true;
    console.log("Redis cache connected.");
  });

  redisClient.on("end", () => {
    redisReady = false;
  });

  try {
    await redisClient.connect();
  } catch (error) {
    redisReady = false;
    console.error("Redis connection failed. Continuing without cache:", error.message);
    redisClient = null;
  }

  return redisClient;
};

export const isRedisReady = () => Boolean(redisClient && redisReady);

export const getCacheValue = async (key) => {
  if (!isRedisReady()) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Redis get failed:", error.message);
    return null;
  }
};

export const setCacheValue = async (key, value, ttlSeconds) => {
  if (!isRedisReady()) {
    return false;
  }

  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch (error) {
    console.error("Redis set failed:", error.message);
    return false;
  }
};

export const invalidateCacheByPrefixes = async (...prefixes) => {
  if (!isRedisReady()) {
    return 0;
  }

  let deletedCount = 0;

  try {
    for (const prefix of prefixes.filter(Boolean)) {
      const keys = [];
      for await (const key of redisClient.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
        keys.push(key);
      }

      if (keys.length) {
        deletedCount += await redisClient.del(keys);
      }
    }
  } catch (error) {
    console.error("Redis invalidation failed:", error.message);
  }

  return deletedCount;
};
