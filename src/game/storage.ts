/** The slice of the Web Storage API we need — easy to fake in tests. */
export interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultStorage(): WebStorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Some browsers throw on `localStorage` access when storage is blocked.
    return null;
  }
}

/**
 * Read and validate a saved JSON value. Anything unreadable — no storage, bad
 * JSON, a shape from an older build, storage that throws — comes back as null,
 * because saved state must never be able to break the app for a learner.
 */
export function readJson<T>(
  key: string,
  parse: (value: unknown) => T | null,
  storage: WebStorageLike | null,
): T | null {
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Write a JSON value, ignoring storage failures such as a full or blocked quota. */
export function writeJson(key: string, value: unknown, storage: WebStorageLike | null): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do — state for this session stays in memory.
  }
}
