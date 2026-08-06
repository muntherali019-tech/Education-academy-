import { describe, it, expect } from "vitest";
import { BADGES, badgeStatus, earnedCount } from "./achievements.js";

// Build a minimal state that satisfies specific badge conditions.
const stateWith = (over = {}) => ({ stats: {}, history: [], courses: [], stars: 0, streakDays: 0, ...over });

const earnedIds = (state) => badgeStatus(state).filter((b) => b.earned).map((b) => b.id);

describe("badgeStatus", () => {
  it("earns nothing on a fresh state", () => {
    expect(earnedIds(stateWith())).toEqual([]);
  });

  it("earns 'first' after one round", () => {
    const s = stateWith({ stats: { "ks2:maths": { rounds: 1, answered: 5, correct: 3, bestStreak: 1, byTopic: {} } } });
    expect(earnedIds(s)).toContain("first");
  });

  it("earns star milestones at the thresholds", () => {
    expect(earnedIds(stateWith({ stars: 49 }))).not.toContain("star50");
    expect(earnedIds(stateWith({ stars: 50 }))).toContain("star50");
    expect(earnedIds(stateWith({ stars: 250 }))).toEqual(expect.arrayContaining(["star50", "star250"]));
  });

  it("earns streak badges at 3/7/30 days", () => {
    expect(earnedIds(stateWith({ streakDays: 3 }))).toContain("streak3");
    expect(earnedIds(stateWith({ streakDays: 7 }))).toEqual(expect.arrayContaining(["streak3", "streak7"]));
    expect(earnedIds(stateWith({ streakDays: 30 }))).toContain("streak30");
  });

  it("earns roll badges from the best streak across subjects", () => {
    const s = stateWith({ stats: { "ks2:maths": { rounds: 1, answered: 10, correct: 10, bestStreak: 10, byTopic: {} } } });
    expect(earnedIds(s)).toEqual(expect.arrayContaining(["roll5", "roll10"]));
  });

  it("earns 'perfect' only for a round of 5+ scored 100%", () => {
    expect(earnedIds(stateWith({ history: [{ total: 4, correct: 4 }] }))).not.toContain("perfect");
    expect(earnedIds(stateWith({ history: [{ total: 5, correct: 4 }] }))).not.toContain("perfect");
    expect(earnedIds(stateWith({ history: [{ total: 5, correct: 5 }] }))).toContain("perfect");
  });

  it("earns 'subjects3' only across three distinct subjects with answers", () => {
    const two = stateWith({
      stats: {
        "ks2:maths": { rounds: 1, answered: 1, correct: 1, bestStreak: 0, byTopic: {} },
        "ks3:maths": { rounds: 1, answered: 1, correct: 1, bestStreak: 0, byTopic: {} }, // same subject
      },
    });
    expect(earnedIds(two)).not.toContain("subjects3");
    const three = stateWith({
      stats: {
        "ks2:maths": { rounds: 1, answered: 1, correct: 1, bestStreak: 0, byTopic: {} },
        "ks2:english": { rounds: 1, answered: 1, correct: 1, bestStreak: 0, byTopic: {} },
        "ks3:science": { rounds: 1, answered: 1, correct: 1, bestStreak: 0, byTopic: {} },
      },
    });
    expect(earnedIds(three)).toContain("subjects3");
  });

  it("ignores subjects with zero answers for 'subjects3'", () => {
    const s = stateWith({
      stats: {
        "ks2:maths": { rounds: 1, answered: 0, correct: 0, bestStreak: 0, byTopic: {} },
        "ks2:english": { rounds: 1, answered: 0, correct: 0, bestStreak: 0, byTopic: {} },
        "ks3:science": { rounds: 1, answered: 0, correct: 0, bestStreak: 0, byTopic: {} },
      },
    });
    expect(earnedIds(s)).not.toContain("subjects3");
  });

  it("earns course badges from passed courses only", () => {
    const s = stateWith({ courses: [{ passed: true }, { passed: false }, { passed: true }, { passed: true }] });
    expect(earnedIds(s)).toEqual(expect.arrayContaining(["course1", "course3"]));
  });

  it("returns a status for every badge", () => {
    const status = badgeStatus(stateWith());
    expect(status).toHaveLength(BADGES.length);
    expect(status.every((b) => typeof b.earned === "boolean")).toBe(true);
  });

  it("tolerates undefined/empty state", () => {
    expect(() => badgeStatus(undefined)).not.toThrow();
    expect(earnedCount(undefined)).toBe(0);
  });
});

describe("earnedCount", () => {
  it("counts earned badges", () => {
    const s = stateWith({ stars: 50, streakDays: 3 });
    expect(earnedCount(s)).toBe(earnedIds(s).length);
    expect(earnedCount(s)).toBeGreaterThanOrEqual(2);
  });
});
