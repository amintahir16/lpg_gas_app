import { NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight in-memory token-bucket / fixed-window rate limiter.
 *
 * IMPORTANT: This implementation is intentionally simple and lives in-process.
 * In a multi-instance deployment (Railway scale > 1, Vercel serverless, k8s
 * with > 1 replica), each replica keeps its own counters, so the effective
 * limit is `limit * replicas`. For real production hardening, swap the
 * `Map` below for a Redis/Upstash-backed store. We deliberately did not
 * pull in a Redis client here to avoid adding a hard runtime dependency
 * to the auth path.
 *
 * What this gives us today:
 * - Slows down credential-stuffing / brute-force on `/api/auth/*` even on
 *   a single Node process (which is the most common deployment shape for
 *   this app).
 * - Returns standard `Retry-After`, `X-RateLimit-Limit`,
 *   `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers so clients
 *   and CDNs can react sensibly.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Logical bucket name, e.g. `'auth:login'`. Combined with the client key. */
  name: string;
  /** Max requests allowed within `windowMs`. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

/**
 * Best-effort client identifier.
 *
 * Falls back through `x-forwarded-for` -> `x-real-ip` -> a placeholder so that
 * even when running behind a proxy without forwarded headers we still bucket
 * traffic per request rather than globally.
 */
export function getClientKey(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const fullKey = `${options.name}:${key}`;
  const existing = buckets.get(fullKey);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(fullKey, { count: 1, resetAt });
    return {
      ok: true,
      remaining: options.limit - 1,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: options.limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

/**
 * Helper that combines `checkRateLimit` with a standardized 429 response.
 * Returns `null` if the request is within the limit, otherwise the response
 * to send back to the client.
 */
export function rateLimitResponse(
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const key = getClientKey(request);
  const result = checkRateLimit(key, options);

  if (result.ok) return null;

  const response = NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429 }
  );
  response.headers.set('Retry-After', String(result.retryAfterSeconds));
  response.headers.set('X-RateLimit-Limit', String(options.limit));
  response.headers.set('X-RateLimit-Remaining', '0');
  response.headers.set('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));
  return response;
}

// Periodically prune stale buckets so the map does not grow unbounded.
// Only schedule this on the server.
if (typeof setInterval !== 'undefined') {
  const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
  // Avoid leaking a timer in test environments.
  // eslint-disable-next-line no-undef
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, PRUNE_INTERVAL_MS);
  // Allow the process to exit even with the timer pending.
  // @ts-expect-error - unref exists in Node but not in DOM types
  if (typeof timer.unref === 'function') timer.unref();
}
