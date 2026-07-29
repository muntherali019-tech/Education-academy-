import { describe, expect, it } from "vitest";
import { createProgress, MAX_ENTRIES, type Progress, type ProgressEntry } from "./progress";
import {
  loadProgress,
  PROGRESS_KEY,
  saveProgress,
  type ProgressStorage,
} from "./progressStorage";

function fakeStorage(initial: Record<string, string> = {}): ProgressStorage & {
  items: Map<string, string>;
} {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

function entry(overrides: Partial<ProgressEntry> = {}): ProgressEntry {
  return {
    stage: "ks2",
    seed: 1,
    correct: 12,
    total: 15,
    percentage: 80,
    passed: true,
    completedAt: 1_700_000_000_000,
    subjects: [{ subject: "Maths", correct: 6, total: 8 }],
    ...overrides,
  };
}

describe("saveProgress / loadProgress", () => {
  it("round-trips progress through storage", () => {
    const storage = fakeStorage();
    const progress: Progress = { entries: [entry(), entry({ seed: 2, stage: "he" })] };

    saveProgress(progress, storage);

    expect(loadProgress(storage)).toEqual(progress);
  });

  it("writes under a versioned key", () => {
    const storage = fakeStorage();
    saveProgress(createProgress(), storage);
    expect(storage.items.has(PROGRESS_KEY)).toBe(true);
  });

  it("starts fresh when nothing has been saved", () => {
    expect(loadProgress(fakeStorage())).toEqual(createProgress());
  });

  it("starts fresh when there is no storage at all", () => {
    expect(loadProgress(null)).toEqual(createProgress());
  });

  it("starts fresh when the saved value is not JSON", () => {
    expect(loadProgress(fakeStorage({ [PROGRESS_KEY]: "not json {" }))).toEqual(createProgress());
  });

  it("starts fresh when the saved shape is wrong", () => {
    expect(loadProgress(fakeStorage({ [PROGRESS_KEY]: '{"entries":"nope"}' }))).toEqual(
      createProgress(),
    );
    expect(loadProgress(fakeStorage({ [PROGRESS_KEY]: "null" }))).toEqual(createProgress());
    expect(loadProgress(fakeStorage({ [PROGRESS_KEY]: "[]" }))).toEqual(createProgress());
  });

  it("drops entries that are malformed or from an unknown stage", () => {
    const stored = JSON.stringify({
      entries: [entry(), entry({ stage: "ks9" as ProgressEntry["stage"] }), { seed: 3 }, null],
    });

    expect(loadProgress(fakeStorage({ [PROGRESS_KEY]: stored })).entries).toEqual([entry()]);
  });

  it("caps a history that grew beyond the limit", () => {
    const entries = Array.from({ length: MAX_ENTRIES + 10 }, (_, i) => entry({ completedAt: i }));
    const storage = fakeStorage({ [PROGRESS_KEY]: JSON.stringify({ entries }) });

    const loaded = loadProgress(storage);

    expect(loaded.entries).toHaveLength(MAX_ENTRIES);
    expect(loaded.entries[0].completedAt).toBe(10);
  });

  it("survives storage that throws on read", () => {
    const throwing: ProgressStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    };
    expect(loadProgress(throwing)).toEqual(createProgress());
  });

  it("survives storage that throws on write", () => {
    const throwing: ProgressStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(() => saveProgress({ entries: [entry()] }, throwing)).not.toThrow();
  });

  it("does nothing when asked to save without storage", () => {
    expect(() => saveProgress({ entries: [entry()] }, null)).not.toThrow();
  });
});
