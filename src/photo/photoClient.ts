import type { PhotoRequest } from "./photo";

/** The two things a photo can be sent off for. */
export type PhotoVerb = "mark" | "solve";

interface Copy {
  service: string;
  feature: string;
  failed: string;
  /** Used when a reply arrives but cannot be read. */
  garbled: string;
}

const COPY: Record<PhotoVerb, Copy> = {
  mark: {
    service: "marking service",
    feature: "Photo marking",
    failed: "Mochi could not mark that photo.",
    garbled: "Mochi could not read the marking that came back.",
  },
  solve: {
    service: "solving service",
    feature: "Scan and solve",
    failed: "Mochi could not solve that problem.",
    garbled: "Mochi could not read the working that came back.",
  },
};

export interface PostPhotoOptions {
  url: string;
  request: PhotoRequest;
  fetchFn?: typeof fetch;
  /** Builds the error type the calling feature throws. */
  fail: (message: string) => Error;
  verb: PhotoVerb;
}

/**
 * Post a photo to one of the vision endpoints and return the parsed JSON body.
 * Every failure becomes an error the UI can show a learner as-is; the caller
 * validates the shape of what comes back.
 */
export async function postPhoto({
  url,
  request,
  fetchFn,
  fail,
  verb,
}: PostPhotoOptions): Promise<unknown> {
  const send = fetchFn ?? globalThis.fetch;
  const copy = COPY[verb];

  let response: Response;
  try {
    response = await send(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw fail(`Mochi could not reach the ${copy.service}. Check your connection.`);
  }

  if (!response.ok) {
    throw fail(messageForStatus(response.status, copy));
  }

  try {
    return await response.json();
  } catch {
    throw fail(copy.garbled);
  }
}

function messageForStatus(status: number, copy: Copy): string {
  if (status === 413) {
    return "That photo was too big for Mochi to read. Try a smaller one.";
  }
  if (status === 429) {
    return "Mochi is busy right now. Please try again in a minute.";
  }
  if (status === 404 || status === 501) {
    return `${copy.feature} is not switched on for this device yet.`;
  }
  return `${copy.failed} Please try again.`;
}
