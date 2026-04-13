/**
 * In-memory rate limiter for API routes
 * Inspired by airi's server runtime approach
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number
  /** Window duration in seconds */
  windowSeconds: number
}

const DEFAULT_CONFIG: RateLimitConfig = { limit: 60, windowSeconds: 60 }

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = identifier
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowSeconds * 1000
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: config.limit - 1, resetAt }
  }

  entry.count++
  if (entry.count > config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt }
}

/**
 * Rate limit presets for different API endpoints
 */
export const RATE_LIMITS = {
  /** Chat API: 30 messages per minute */
  chat: { limit: 30, windowSeconds: 60 },
  /** TTS: 20 requests per minute */
  tts: { limit: 20, windowSeconds: 60 },
  /** Auth: 10 attempts per minute (brute force protection) */
  auth: { limit: 10, windowSeconds: 60 },
  /** Register: 5 per hour */
  register: { limit: 5, windowSeconds: 3600 },
  /** General API: 120 per minute */
  general: { limit: 120, windowSeconds: 60 },
  /** Admin: 60 per minute */
  admin: { limit: 60, windowSeconds: 60 },
  /** Export: 10 per minute */
  export: { limit: 10, windowSeconds: 60 },
} as const

export function getRateLimitHeaders(remaining: number, resetAt: number) {
  return {
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  }
}
