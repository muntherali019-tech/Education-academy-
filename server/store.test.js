import { describe, it, expect } from "vitest";
import { newId, newCode, overview, weakest } from "./store.js";

describe("id/code generators", () => {
  it("newId returns a unique uuid", () => {
    const a = newId(), b = newId();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });

  it("newCode returns a 6-char uppercase hex class code", () => {
    const code = newCode();
    expect(code).toMatch(/^[0-9A-F]{6}$/);
  });
});

describe("overview (server mirror of client stats)", () => {
  it("aggregates totals, accuracy, courses and last-active", () => {
    const state = {
      stars: 42,
      stats: {
        "ks2:maths": { answered: 10, correct: 5, rounds: 1, bestStreak: 3 },
        "ks3:science": { answered: 10, correct: 10, rounds: 2, bestStreak: 8 },
      },
      courses: [{ passed: true }, { passed: false }],
      history: [{ ts: 1000 }, { ts: 500 }],
    };
    const ov = overview(state);
    expect(ov.stars).toBe(42);
    expect(ov.answered).toBe(20);
    expect(ov.correct).toBe(15);
    expect(ov.rounds).toBe(3);
    expect(ov.bestStreak).toBe(8);
    expect(ov.accuracy).toBe(75);
    expect(ov.coursesTaken).toBe(2);
    expect(ov.coursesPassed).toBe(1);
    expect(ov.lastActive).toBe(1000);
  });

  it("is safe on empty/undefined state", () => {
    const ov = overview(undefined);
    expect(ov.answered).toBe(0);
    expect(ov.accuracy).toBe(0);
    expect(ov.coursesTaken).toBe(0);
    expect(ov.lastActive).toBeNull();
  });
});

describe("weakest", () => {
  it("returns lowest-accuracy topics with 3+ attempts", () => {
    const state = {
      stats: {
        "ks2:maths": {
          byTopic: {
            Fractions: { answered: 10, correct: 2 }, // 20%
            Division: { answered: 10, correct: 9 },  // 90%
            Barely: { answered: 2, correct: 0 },     // ignored (<3)
          },
        },
      },
    };
    const weak = weakest(state, 3);
    expect(weak).toHaveLength(2);
    expect(weak[0]).toMatchObject({ subject: "maths", topic: "Fractions", accuracy: 20 });
    expect(weak[1].topic).toBe("Division");
  });

  it("respects the limit", () => {
    const state = {
      stats: {
        "ks2:maths": {
          byTopic: {
            A: { answered: 5, correct: 1 },
            B: { answered: 5, correct: 2 },
            C: { answered: 5, correct: 3 },
          },
        },
      },
    };
    expect(weakest(state, 2)).toHaveLength(2);
  });

  it("is safe on empty state", () => {
    expect(weakest({})).toEqual([]);
    expect(weakest(undefined)).toEqual([]);
  });
});
