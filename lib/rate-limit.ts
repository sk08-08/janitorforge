// ============================================================================
// Rate Limiting Utilities
// In-memory rate limiting (for production use Redis)
// ============================================================================

// In-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 5;

/**
 * Get client IP address from headers
 */
export function getClientIp(headers: Headers | null): string {
  if (!headers) return "unknown";

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return headers.get("x-real-ip") || "unknown";
}

/**
 * Check rate limiting for an IP
 */
export function checkRateLimit(clientIp: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(clientIp);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(clientIp, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE - 1 };
  }

  if (record.count >= MAX_REQUESTS_PER_MINUTE) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE - record.count };
}

/**
 * Clear rate limit record for an IP (admin use)
 */
export function clearRateLimit(clientIp: string): void {
  rateLimitStore.delete(clientIp);
}

/**
 * Get current rate limit stats (for debugging)
 */
export function getRateLimitStats(
  clientIp: string,
): { count: number; resetTime: number } | null {
  return rateLimitStore.get(clientIp) || null;
}
