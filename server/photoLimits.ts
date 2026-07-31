import type { PhotoRequestOptions } from "./photoRequest";
import { createRateLimiter, type RateLimiter } from "./rateLimit";

export const HOUR_MS = 60 * 60 * 1000;

/** Photos one client may send per hour, across marking and solving together. */
export const PHOTOS_PER_CLIENT_PER_HOUR = 20;

/** Photos the deployment will pay for per hour, across every client. */
export const PHOTOS_PER_HOUR = 120;

export interface PhotoLimitsOptions {
  perClient?: number;
  overall?: number;
  windowMs?: number;
  /** Injectable clock, so tests do not have to wait out a window. */
  now?: () => number;
}

export interface PhotoLimits {
  /** The limits to apply to a request from `clientKey`. */
  for(clientKey: string): NonNullable<PhotoRequestOptions["limits"]>;
  perClient: RateLimiter;
  overall: RateLimiter;
}

const OVERALL_KEY = "*";

/**
 * The limits both vision endpoints share. One set of limiters covers marking
 * and solving together, because they draw on the same budget.
 *
 * The per-client limit is checked first, so a client that is already over it
 * cannot burn through the deployment's overall allowance as well.
 */
export function createPhotoLimits({
  perClient = PHOTOS_PER_CLIENT_PER_HOUR,
  overall = PHOTOS_PER_HOUR,
  windowMs = HOUR_MS,
  now,
}: PhotoLimitsOptions = {}): PhotoLimits {
  const perClientLimiter = createRateLimiter({ limit: perClient, windowMs, now });
  const overallLimiter = createRateLimiter({ limit: overall, windowMs, maxKeys: 1, now });

  return {
    for: (clientKey: string) => [
      { limiter: perClientLimiter, key: clientKey },
      { limiter: overallLimiter, key: OVERALL_KEY },
    ],
    perClient: perClientLimiter,
    overall: overallLimiter,
  };
}

/** Reads the limits from the environment, falling back to the defaults above. */
export function limitsFromEnv(env: Record<string, string | undefined>): PhotoLimitsOptions {
  return {
    perClient: positiveInt(env.PHOTO_RATE_LIMIT_PER_CLIENT) ?? PHOTOS_PER_CLIENT_PER_HOUR,
    overall: positiveInt(env.PHOTO_RATE_LIMIT_TOTAL) ?? PHOTOS_PER_HOUR,
  };
}

function positiveInt(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
