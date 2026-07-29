import { MarkingError, type Marker, type MarkingRequest } from "../src/marking/marking";
import { isAllowedMediaType, MAX_PHOTO_BYTES } from "../src/marking/photo";
import { isStageId } from "../src/game/stages";

export interface HandlerResponse {
  status: number;
  body: { error: string } | Record<string, unknown>;
}

/** Base64 inflates by 4/3, so this is the encoded ceiling for MAX_PHOTO_BYTES. */
const MAX_BASE64_LENGTH = Math.ceil((MAX_PHOTO_BYTES * 4) / 3);

function parseRequest(raw: unknown): MarkingRequest | null {
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
 * Handle one marking request. Transport-agnostic: give it the parsed body and
 * a marker, and it returns the status and JSON to send back.
 */
export async function handleMarkRequest(raw: unknown, marker: Marker): Promise<HandlerResponse> {
  const request = parseRequest(raw);
  if (request === null) {
    return { status: 400, body: { error: "Expected a stage, an image media type and a photo." } };
  }
  if (request.base64.length > MAX_BASE64_LENGTH) {
    return { status: 413, body: { error: "That photo is too big to mark." } };
  }

  try {
    return { status: 200, body: { ...(await marker(request)) } };
  } catch (error) {
    const message =
      error instanceof MarkingError
        ? error.message
        : "Mochi could not mark that photo. Please try again.";
    return { status: 502, body: { error: message } };
  }
}
