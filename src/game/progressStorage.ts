import { createProgress, MAX_ENTRIES, type Progress, type ProgressEntry } from "./progress";
import { isStageId } from "./stages";
import { defaultStorage, readJson, writeJson, type WebStorageLike } from "./storage";

export const PROGRESS_KEY = "education-academy:progress:v1";

export type { WebStorageLike as ProgressStorage };

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

function parseProgress(value: unknown): Progress | null {
  const entries = (value as { entries?: unknown })?.entries;
  if (!Array.isArray(entries)) {
    return null;
  }
  return { entries: entries.filter(isProgressEntry).slice(-MAX_ENTRIES) };
}

/**
 * Read saved progress. Anything unreadable is treated as a fresh start rather
 * than an error, because a corrupt history must never block a learner.
 */
export function loadProgress(storage: WebStorageLike | null = defaultStorage()): Progress {
  return readJson(PROGRESS_KEY, parseProgress, storage) ?? createProgress();
}

/** Save progress, ignoring storage failures such as a full or blocked quota. */
export function saveProgress(
  progress: Progress,
  storage: WebStorageLike | null = defaultStorage(),
): void {
  writeJson(PROGRESS_KEY, progress, storage);
}
