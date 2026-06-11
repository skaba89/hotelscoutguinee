// HotelScout Guinea — Rate Limiting Middleware
// Simple in-memory rate limiter for API routes

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt) {
      rateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// Preset configurations
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60 * 1000, maxRequests: 60 },        // 60 req/min
  ai: { windowMs: 60 * 1000, maxRequests: 10 },             // 10 req/min (expensive)
  cron: { windowMs: 60 * 1000, maxRequests: 2 },            // 2 req/min
  export: { windowMs: 60 * 1000, maxRequests: 5 },          // 5 req/min
  write: { windowMs: 60 * 1000, maxRequests: 20 },          // 20 req/min
};

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.default
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimits.get(identifier);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimits.set(identifier, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getRateLimitHeaders(result: { remaining: number; resetAt: number }, config: RateLimitConfig) {
  return {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}
