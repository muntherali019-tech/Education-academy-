import { describe, expect, it } from "vitest";
import type { RoundResult } from "./progress";
import {
  browserStore,
  loadHistory,
  saveHistory,
  STORAGE_KEY,
  type HistoryStore,
} from "./storage";

const sample: RoundResult = {
  stage: "ks2",
  seed: 7,
  correct: 12,
  total: 15,
  percentage: 80,
  passed: true,
  completedAt: "2026-01-01T10:00:00.000Z",
};

/** In-memory HistoryStore; optionally throws to simulate quota or lockdown. */
function fakeStore(initial?: string, throwOn?: "get" | "set"): HistoryStore {
  let value = initial ?? null;
  return {
    getItem: () => {
      if (throwOn === "get") throw new Error("blocked");
      return value;
    },
    setItem: (_key, next) => {
      if (throwOn === "set") throw new Error("quota exceeded");
      value = next;
    },
  };
}

describe("loadHistory", () => {
  it("returns empty when there is no store", () => {
    expect(loadHistory(null)).toEqual([]);
  });

  it("returns empty when nothing is stored", () => {
    expect(loadHistory(fakeStore())).toEqual([]);
  });

  it("reads back what was written", () => {
    const store = fakeStore();
    saveHistory(store, [sample]);
    expect(loadHistory(store)).toEqual([sample]);
  });

  it("returns empty on corrupt JSON rather than throwing", () => {
    expect(loadHistory(fakeStore("{not json"))).toEqual([]);
  });

  it("returns empty when the payload is not an array", () => {
    expect(loadHistory(fakeStore('{"stage":"ks1"}'))).toEqual([]);
    expect(loadHistory(fakeStore('"a string"'))).toEqual([]);
    expect(loadHistory(fakeStore("null"))).toEqual([]);
  });

  it("drops malformed entries but keeps valid ones", () => {
    const raw = JSON.stringify([sample, { stage: "ks9" }, null, { ...sample, passed: "yes" }]);
    expect(loadHistory(fakeStore(raw))).toEqual([sample]);
  });

  it("returns empty when reading throws", () => {
    expect(loadHistory(fakeStore(undefined, "get"))).toEqual([]);
  });
});

describe("saveHistory", () => {
  it("reports failure when there is no store", () => {
    expect(saveHistory(null, [sample])).toBe(false);
  });

  it("reports success on a write", () => {
    expect(saveHistory(fakeStore(), [sample])).toBe(true);
  });

  it("reports failure instead of throwing when the write is rejected", () => {
    expect(saveHistory(fakeStore(undefined, "set"), [sample])).toBe(false);
  });

  it("writes under the versioned key", () => {
    const seen: string[] = [];
    const store: HistoryStore = {
      getItem: () => null,
      setItem: (key) => void seen.push(key),
    };
    saveHistory(store, [sample]);
    expect(seen).toEqual([STORAGE_KEY]);
  });

  it("round-trips an empty history", () => {
    const store = fakeStore();
    expect(saveHistory(store, [])).toBe(true);
    expect(loadHistory(store)).toEqual([]);
  });
});

describe("browserStore", () => {
  it("returns the jsdom localStorage in this environment", () => {
    const store = browserStore();
    expect(store).not.toBeNull();

    saveHistory(store, [sample]);
    expect(loadHistory(store)).toEqual([sample]);
    localStorage.clear();
  });
});
