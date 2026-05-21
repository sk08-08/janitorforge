// ============================================================================
// JanitorForge - Redis Rate Limiting Configuration
// Production-ready rate limiting with Redis fallback
// ============================================================================

import { checkRateLimit as memoryCheckRateLimit } from "./rate-limit";

// Type for rate limit check result
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime?: number;
  error?: string;
}

// Check if Redis is available
const REDIS_URL = process.env.REDIS_URL;
const USE_REDIS = !!REDIS_URL;

/**
 * Check rate limit using Redis (if available) or in-memory store
 */
export async function checkRateLimitAsync(
  clientIp: string,
  options?: {
    maxRequests?: number;
    windowMs?: number;
  },
): Promise<RateLimitResult> {
  const maxRequests = options?.maxRequests || 5;
  const windowMs = options?.windowMs || 60000; // 1 minute

  try {
    if (USE_REDIS) {
      // Try to use Redis
      try {
        const response = await fetch(`${REDIS_URL}/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: `rate-limit:${clientIp}`,
            limit: maxRequests,
            window: Math.floor(windowMs / 1000),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            allowed: data.allowed,
            remaining: data.remaining,
            resetTime: data.resetTime,
          };
        }
      } catch (redisError) {
        console.warn(
          "Redis rate limit failed, falling back to memory:",
          redisError,
        );
      }
    }

    // Fallback to in-memory rate limiting
    const result = memoryCheckRateLimit(clientIp);
    return {
      allowed: result.allowed,
      remaining: result.remaining,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Allow on error (fail open)
    return { allowed: true, remaining: maxRequests };
  }
}

/**
 * Clear rate limit for an IP (for testing)
 */
export function clearRateLimit(clientIp: string): void {
  // Only clear in-memory (Redis clearing requires more complex logic)
  const { clearRateLimit: clearMemory } = require("./rate-limit");
  clearMemory(clientIp);
}

/**
 * Get current Redis configuration status
 */
export function getRateLimitConfig() {
  return {
    useRedis: USE_REDIS,
    redisUrl: USE_REDIS ? "configured" : "not-configured",
    fallbackMethod: "in-memory-store",
  };
}
