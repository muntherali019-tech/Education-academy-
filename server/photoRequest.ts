import { LearnerError } from "../src/errors";
import { isAllowedMediaType, MAX_PHOTO_BYTES, type PhotoRequest } from "../src/photo/photo";
import { isStageId } from "../src/game/stages";

export interface HandlerResponse {
  status: number;
  /** JSON to send back: the feature's result, or `{ error }`. */
  body: unknown;
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
): Promise<HandlerResponse> {
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
