const MAX_FAILED_ATTEMPTS = 10;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

// In-memory store keyed by IP. Resets on server restart.
const loginAttempts = new Map();

const getClientIp = (req) => {
  return req.ip || req.connection?.remoteAddress || "unknown";
};

export const checkLoginRateLimit = (req, res, next) => {
  const now = Date.now();
  const ip = getClientIp(req);
  const entry = loginAttempts.get(ip);

  if (entry?.blockedUntil && entry.blockedUntil > now) {
    const retryAfterSec = Math.ceil((entry.blockedUntil - now) / 1000);
    res.set("Retry-After", String(retryAfterSec));
    return res.status(429).json({
      msg: "Too many failed login attempts. Try again later."
    });
  }

  if (entry?.blockedUntil && entry.blockedUntil <= now) {
    loginAttempts.delete(ip);
  }

  next();
};

export const recordLoginFailure = (req) => {
  const now = Date.now();
  const ip = getClientIp(req);
  const entry = loginAttempts.get(ip);

  if (!entry) {
    loginAttempts.set(ip, { count: 1, lastFailedAt: now, blockedUntil: null });
    return;
  }

  if (entry.blockedUntil && entry.blockedUntil > now) {
    return;
  }

  if (entry.lastFailedAt && now - entry.lastFailedAt > BLOCK_DURATION_MS) {
    entry.count = 0;
  }

  entry.count += 1;
  entry.lastFailedAt = now;

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
  }
};

export const recordLoginSuccess = (req) => {
  const ip = getClientIp(req);
  loginAttempts.delete(ip);
};
