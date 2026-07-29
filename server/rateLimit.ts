/**
 * A small in-memory rate limiter for the vision endpoints. Each photo is a paid
 * API call, so the endpoints are limited per client and in total.
 *
 * The window slides: a client that spends its allowance gets capacity back as
 * its oldest request ages out, rather than everything unlocking at once on a
 * fixed boundary.
 */

export interface RateLimitDecision {
  allowed: boolean;
  /** Requests left in the window after this one; 0 when denied. */
  remaining: number;
  /** Seconds until the next request would be allowed; 0 when allowed. */
  retryAfterSeconds: number;
}

export interface RateLimiterOptions {
  /** Requests allowed per key per window. */
  limit: number;
  windowMs: number;
  /**
   * Most distinct keys to track. Keys are cheap to invent — a spoofed client
   * address per request would otherwise grow this map without bound — so the
   * least recently seen are evicted once the ceiling is reached.
   */
  maxKeys?: number;
  /** Injectable clock, so tests do not have to wait out a window. */
  now?: () => number;
}

export interface RateLimiter {
  /** Records a request against `key` and says whether it may proceed. */
  check(key: string): RateLimitDecision;
  /** How many keys are currently tracked — for tests and monitoring. */
  size(): number;
}

export const DEFAULT_MAX_KEYS = 10_000;

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = DEFAULT_MAX_KEYS,
  now = Date.now,
}: RateLimiterOptions): RateLimiter {
  /** Key to the timestamps of its requests inside the window, oldest first. */
  const hits = new Map<string, number[]>();

  function sweep(cutoff: number): void {
    for (const [key, times] of hits) {
      if (times.length === 0 || times[times.length - 1] <= cutoff) {
        hits.delete(key);
      }
    }
  }

  /**
   * Map iterates in insertion order and every touch re-inserts, so the first
   * key is the least recently seen. Keys that are currently over the limit are
   * evicted last: dropping one would hand it a fresh allowance, which is
   * exactly what an abusive caller wants.
   */
  function evictOldest(cutoff: number): void {
    for (const [key, times] of hits) {
      if (hits.size <= maxKeys) {
        return;
      }
      if (times.filter((time) => time > cutoff).length < limit) {
        hits.delete(key);
      }
    }
    // Everything left is at the limit. Memory has to be bounded regardless, so
    // drop the oldest — the global limiter is what caps spend when a caller
    // can invent keys faster than we can remember them.
    for (const key of hits.keys()) {
      if (hits.size <= maxKeys) {
        return;
      }
      hits.delete(key);
    }
  }

  return {
    check(key: string): RateLimitDecision {
      const at = now();
      const cutoff = at - windowMs;

      const previous = hits.get(key) ?? [];
      const times = previous.filter((time) => time > cutoff);

      if (times.length >= limit) {
        // Re-insert so an over-limit client stays "recently seen" and is not
        // evicted — evicting it would hand back a fresh allowance.
        hits.delete(key);
        hits.set(key, times);
        const waitMs = times[0] + windowMs - at;
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
        };
      }

      times.push(at);
      hits.delete(key);
      hits.set(key, times);

      if (hits.size > maxKeys) {
        sweep(cutoff);
        evictOldest(cutoff);
      }

      return { allowed: true, remaining: limit - times.length, retryAfterSeconds: 0 };
    },

    size(): number {
      return hits.size;
    },
  };
}
