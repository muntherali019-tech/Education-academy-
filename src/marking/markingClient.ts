import {
  MarkingError,
  parseMarkingResult,
  type Marker,
  type MarkingRequest,
  type MarkingResult,
} from "./marking";

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

function messageForStatus(status: number): string {
  if (status === 413) {
    return "That photo was too big for Mochi to read. Try a smaller one.";
  }
  if (status === 429) {
    return "Mochi is marking a lot of homework right now. Please try again in a minute.";
  }
  if (status === 404 || status === 501) {
    return "Photo marking is not switched on for this device yet.";
  }
  return "Mochi could not mark that photo. Please try again.";
}

export function createHttpMarker({ endpoint, fetchFn }: HttpMarkerOptions = {}): Marker {
  return async (request: MarkingRequest): Promise<MarkingResult> => {
    const send = fetchFn ?? globalThis.fetch;
    const url = endpoint ?? configuredEndpoint();

    let response: Response;
    try {
      response = await send(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
    } catch {
      throw new MarkingError("Mochi could not reach the marking service. Check your connection.");
    }

    if (!response.ok) {
      throw new MarkingError(messageForStatus(response.status));
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new MarkingError("Mochi could not read the marking that came back.");
    }

    const result = parseMarkingResult(payload);
    if (result === null) {
      throw new MarkingError("Mochi could not read the marking that came back.");
    }
    return result;
  };
}
