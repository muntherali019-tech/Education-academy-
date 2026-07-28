import { isRoundResult, type RoundResult } from "./progress";

export const STORAGE_KEY = "education-academy:progress:v1";

/** The slice of the Storage API this module needs, so tests can supply a fake. */
export interface HistoryStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * localStorage, or null where it is unavailable — Safari private mode and SSR
 * both make access throw rather than return undefined.
 */
export function browserStore(): HistoryStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * Read history. Corrupt JSON, a non-array payload, or individual malformed
 * entries are discarded rather than thrown, so a bad write cannot lock a
 * learner out of the game.
 */
export function loadHistory(store: HistoryStore | null): RoundResult[] {
  if (!store) {
    return [];
  }
  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (raw === null) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isRoundResult);
}

/** Persist history. Returns false if the write failed (quota, private mode). */
export function saveHistory(
  store: HistoryStore | null,
  history: readonly RoundResult[],
): boolean {
  if (!store) {
    return false;
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch {
    return false;
  }
}
