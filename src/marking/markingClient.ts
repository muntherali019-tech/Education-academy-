import { postPhoto } from "../photo/photoClient";
import { MarkingError, parseMarkingResult, type Marker } from "./marking";

/**
 * The photo never goes to Anthropic from the browser — it goes to this
 * endpoint, which holds the API key server side. See `server/README.md` for the
 * contract and `server/claudeMarker.ts` for the implementation.
 */
export const DEFAULT_MARKING_ENDPOINT = "/api/mark";

export function configuredEndpoint(): string {
  const configured = import.meta.env?.VITE_MARKING_ENDPOINT;
  return typeof configured === "string" && configured !== ""
    ? configured
    : DEFAULT_MARKING_ENDPOINT;
}

export interface HttpMarkerOptions {
  endpoint?: string;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetchFn?: typeof fetch;
}

export function createHttpMarker({ endpoint, fetchFn }: HttpMarkerOptions = {}): Marker {
  return async (request) => {
    const payload = await postPhoto({
      url: endpoint ?? configuredEndpoint(),
      request,
      fetchFn,
      fail: (message) => new MarkingError(message),
      verb: "mark",
    });
    const result = parseMarkingResult(payload);
    if (result === null) {
      throw new MarkingError("Mochi could not read the marking that came back.");
    }
    return result;
  };
}
