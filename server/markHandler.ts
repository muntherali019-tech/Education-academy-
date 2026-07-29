import type { Marker } from "../src/marking/marking";
import { handlePhotoRequest, type HandlerResponse } from "./photoRequest";

export type { HandlerResponse };

/**
 * Handle one marking request. Transport-agnostic: give it the parsed body and
 * a marker, and it returns the status and JSON to send back.
 */
export function handleMarkRequest(raw: unknown, marker: Marker): Promise<HandlerResponse> {
  return handlePhotoRequest(raw, marker, "Mochi could not mark that photo. Please try again.");
}
