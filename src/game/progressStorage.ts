import { createProgress, MAX_ENTRIES, type Progress, type ProgressEntry } from "./progress";
import { isStageId } from "./stages";

export const PROGRESS_KEY = "education-academy:progress:v1";

/** The slice of the Web Storage API we need — easy to fake in tests. */
export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): ProgressStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Some browsers throw on `localStorage` access when storage is blocked.
    return null;
  }
}

function isSubjectTally(value: unknown): boolean {
  const tally = value as Record<string, unknown>;
  return (
    typeof tally?.subject === "string" &&
    typeof tally.correct === "number" &&
    typeof tally.total === "number"
  );
}

function isProgressEntry(value: unknown): value is ProgressEntry {
  const entry = value as Record<string, unknown>;
  return (
    typeof entry?.stage === "string" &&
    isStageId(entry.stage) &&
    typeof entry.seed === "number" &&
    typeof entry.correct === "number" &&
    typeof entry.total === "number" &&
    typeof entry.percentage === "number" &&
    typeof entry.passed === "boolean" &&
    typeof entry.completedAt === "number" &&
    Array.isArray(entry.subjects) &&
    entry.subjects.every(isSubjectTally)
  );
}

/**
 * Read saved progress. Anything unreadable — no storage, bad JSON, a shape from
 * an older build — is treated as a fresh start rather than an error, because a
 * corrupt history must never block a learner from playing.
 */
export function loadProgress(storage: ProgressStorage | null = defaultStorage()): Progress {
  if (!storage) {
    return createProgress();
  }
  let raw: string | null;
  try {
    raw = storage.getItem(PROGRESS_KEY);
  } catch {
    return createProgress();
  }
  if (raw === null) {
    return createProgress();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return createProgress();
  }
  const entries = (parsed as { entries?: unknown })?.entries;
  if (!Array.isArray(entries)) {
    return createProgress();
  }
  return { entries: entries.filter(isProgressEntry).slice(-MAX_ENTRIES) };
}

/** Save progress, ignoring storage failures such as a full or blocked quota. */
export function saveProgress(
  progress: Progress,
  storage: ProgressStorage | null = defaultStorage(),
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Nothing to do — progress for this session stays in memory.
  }
}
