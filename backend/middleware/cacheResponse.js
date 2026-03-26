import { getCacheValue, isRedisReady, setCacheValue } from "../services/cacheService.js";

const buildCacheKey = (prefix, req) => {
  const query = req.originalUrl || req.url || req.path;
  return `${prefix}:${query}`;
};

export const cacheJsonResponse = ({ prefix, ttlSeconds = 300 }) => {
  return async (req, res, next) => {
    if (req.method !== "GET" || !prefix || !isRedisReady()) {
      return next();
    }

    const cacheKey = buildCacheKey(prefix, req);
    const cached = await getCacheValue(cacheKey);

    if (cached !== null) {
      res.set("X-Cache", "HIT");
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        res.set("X-Cache", "MISS");
        void setCacheValue(cacheKey, body, ttlSeconds);
      }

      return originalJson(body);
    };

    return next();
  };
};
