import { describe, expect, it } from "vitest";
import { seededRng, shuffle } from "./random";

describe("seededRng", () => {
  it("is deterministic for a given seed", () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const first = [a(), a(), a()];
    const second = [b(), b(), b()];
    expect(first).toEqual(second);
  });

  it("differs across seeds", () => {
    expect(seededRng(1)()).not.toBe(seededRng(2)());
  });

  it("stays within [0, 1)", () => {
    const rng = seededRng(7);
    for (let i = 0; i < 500; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("shuffle", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];

  it("does not mutate the input", () => {
    const original = items.slice();
    shuffle(items, seededRng(3));
    expect(items).toEqual(original);
  });

  it("keeps every element exactly once", () => {
    const shuffled = shuffle(items, seededRng(3));
    expect(shuffled.slice().sort((a, b) => a - b)).toEqual(items);
  });

  it("produces the same order for the same seed", () => {
    expect(shuffle(items, seededRng(9))).toEqual(shuffle(items, seededRng(9)));
  });

  it("handles empty and single-element arrays", () => {
    expect(shuffle([], seededRng(1))).toEqual([]);
    expect(shuffle(["only"], seededRng(1))).toEqual(["only"]);
  });
});
