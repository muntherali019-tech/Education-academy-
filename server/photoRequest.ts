import { LearnerError } from "../src/errors";
import { isAllowedMediaType, MAX_PHOTO_BYTES, type PhotoRequest } from "../src/photo/photo";
import { isStageId } from "../src/game/stages";
import type { RateLimiter } from "./rateLimit";

export interface HandlerResponse {
  status: number;
  /** JSON to send back: the feature's result, or `{ error }`. */
  body: unknown;
  /** Headers the transport should set, such as `retry-after` on a 429. */
  headers?: Record<string, string>;
}

export interface PhotoRequestOptions {
  /**
   * Limiters applied in order before any work is done, each with the key to
   * count against — typically one per client and one for the endpoint overall.
   * Every photo is a paid API call, so an endpoint without these is a bill
   * anyone can run up.
   */
  limits?: Array<{ limiter: RateLimiter; key: string }>;
}

/** Base64 inflates by 4/3, so this is the encoded ceiling for MAX_PHOTO_BYTES. */
export const MAX_BASE64_LENGTH = Math.ceil((MAX_PHOTO_BYTES * 4) / 3);

export function parsePhotoRequest(raw: unknown): PhotoRequest | null {
  const body = raw as Record<string, unknown>;
  if (
    typeof body?.stage !== "string" ||
    !isStageId(body.stage) ||
    typeof body.mediaType !== "string" ||
    !isAllowedMediaType(body.mediaType) ||
    typeof body.base64 !== "string" ||
    body.base64 === ""
  ) {
    return null;
  }
  return { stage: body.stage, mediaType: body.mediaType, base64: body.base64 };
}

/**
 * Shared plumbing for the vision endpoints: validate the body, run the work,
 * and turn any failure into a response whose message is safe for a learner.
 */
export async function handlePhotoRequest<T>(
  raw: unknown,
  work: (request: PhotoRequest) => Promise<T>,
  fallback: string,
  { limits = [] }: PhotoRequestOptions = {},
): Promise<HandlerResponse> {
  // Checked first: a rejected caller should cost as little as possible, and a
  // malformed body should not be a way to probe without spending allowance.
  for (const { limiter, key } of limits) {
    const decision = limiter.check(key);
    if (!decision.allowed) {
      return {
        status: 429,
        body: { error: "Mochi has had a lot of photos in the last hour. Please try again later." },
        headers: { "retry-after": String(decision.retryAfterSeconds) },
      };
    }
  }

  const request = parsePhotoRequest(raw);
  if (request === null) {
    return { status: 400, body: { error: "Expected a stage, an image media type and a photo." } };
  }
  if (request.base64.length > MAX_BASE64_LENGTH) {
    return { status: 413, body: { error: "That photo is too big to use." } };
  }

  try {
    return { status: 200, body: await work(request) };
  } catch (error) {
    const message = error instanceof LearnerError ? error.message : fallback;
    return { status: 502, body: { error: message } };
  }
}
