import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  defaultState,
  addStars,
  starsToday,
  touchStreak,
  dailyDone,
  markDailyDone,
  loadState,
  saveState,
  recordRound,
  overview,
  weakestTopics,
  recordCourseResult,
  DAILY_GOAL,
} from "./progress.js";

// Fix "now" so the UTC dayKey is deterministic. Noon avoids timezone edge flips.
const FIXED = new Date("2024-03-15T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("defaultState", () => {
  it("starts empty and unsubscribed", () => {
    const s = defaultState();
    expect(s.stars).toBe(0);
    expect(s.subs).toEqual({ junior: false, adult: false });
    expect(s.history).toEqual([]);
    expect(s.stats).toEqual({});
    expect(s.mochi.color).toBe("ginger");
  });
});

describe("addStars", () => {
  it("adds stars and tracks today's total", () => {
    const s = addStars(defaultState(), 3);
    expect(s.stars).toBe(3);
    expect(starsToday(s)).toBe(3);
  });

  it("defaults to +1", () => {
    expect(addStars(defaultState()).stars).toBe(1);
  });

  it("resets starsToday when the day rolls over", () => {
    let s = addStars(defaultState(), 5); // earned today
    expect(starsToday(s)).toBe(5);
    // Advance to the next day and add more.
    vi.setSystemTime(new Date("2024-03-16T12:00:00.000Z"));
    s = addStars(s, 2);
    expect(s.stars).toBe(7); // cumulative unaffected
    expect(starsToday(s)).toBe(2); // today's counter reset
  });

  it("does not mutate the input state", () => {
    const s0 = defaultState();
    addStars(s0, 5);
    expect(s0.stars).toBe(0);
  });
});

describe("touchStreak", () => {
  it("starts a streak at 1 on first activity", () => {
    const s = touchStreak(defaultState());
    expect(s.streakDays).toBe(1);
    expect(s.lastDay).toBe("2024-03-15");
  });

  it("is a no-op when already touched today", () => {
    const once = touchStreak(defaultState());
    const twice = touchStreak(once);
    expect(twice).toBe(once); // same reference, unchanged
    expect(twice.streakDays).toBe(1);
  });

  it("increments when the last activity was yesterday", () => {
    const s = touchStreak({ ...defaultState(), lastDay: "2024-03-14", streakDays: 4 });
    expect(s.streakDays).toBe(5);
    expect(s.lastDay).toBe("2024-03-15");
  });

  it("resets to 1 after a gap with no freeze", () => {
    const s = touchStreak({ ...defaultState(), lastDay: "2024-03-10", streakDays: 9 });
    expect(s.streakDays).toBe(1);
  });

  it("uses a freeze to cover exactly one missed day", () => {
    const s = touchStreak({ ...defaultState(), lastDay: "2024-03-13", streakDays: 6, freezes: 2 });
    expect(s.streakDays).toBe(7);
    expect(s.freezes).toBe(1); // one freeze consumed
  });

  it("does not use a freeze for a two-plus day gap when streak is zero", () => {
    const s = touchStreak({ ...defaultState(), lastDay: "2024-03-13", streakDays: 0, freezes: 2 });
    expect(s.streakDays).toBe(1);
    expect(s.freezes).toBe(2); // freeze preserved
  });

  it("does not use a freeze for a three-day gap", () => {
    const s = touchStreak({ ...defaultState(), lastDay: "2024-03-11", streakDays: 5, freezes: 2 });
    expect(s.streakDays).toBe(1);
    expect(s.freezes).toBe(2);
  });
});

describe("daily challenge", () => {
  it("dailyDone is false before, true after", () => {
    const s0 = defaultState();
    expect(dailyDone(s0)).toBe(false);
    const s1 = markDailyDone(s0, 5);
    expect(dailyDone(s1)).toBe(true);
  });

  it("awards the bonus and touches the streak once per day", () => {
    const s = markDailyDone(defaultState(), 5);
    expect(s.stars).toBe(5);
    expect(s.streakDays).toBe(1);
  });

  it("is idempotent within the same day", () => {
    const s1 = markDailyDone(defaultState(), 5);
    const s2 = markDailyDone(s1, 5);
    expect(s2).toBe(s1);
    expect(s2.stars).toBe(5);
  });

  it("exposes the daily goal constant", () => {
    expect(DAILY_GOAL).toBe(10);
  });
});

describe("loadState / saveState", () => {
  it("round-trips through localStorage", () => {
    const s = addStars(defaultState(), 12);
    s.stats["ks2:maths"] = { answered: 1, correct: 1, rounds: 1, bestStreak: 1, byTopic: {} };
    saveState(s);
    const loaded = loadState();
    expect(loaded.stars).toBe(12);
    expect(loaded.stats["ks2:maths"].answered).toBe(1);
  });

  it("returns default state when storage is empty", () => {
    expect(loadState()).toEqual(defaultState());
  });

  it("returns default state on corrupt JSON", () => {
    localStorage.setItem("whisker.v1", "{not json");
    expect(loadState()).toEqual(defaultState());
  });

  it("merges defaults over a partial saved state", () => {
    // Missing keys (e.g. mochi) should be filled from defaults.
    localStorage.setItem("whisker.v1", JSON.stringify({ stars: 3, stats: {} }));
    const loaded = loadState();
    expect(loaded.stars).toBe(3);
    expect(loaded.mochi.color).toBe("ginger");
  });
});

describe("recordRound", () => {
  const base = () => defaultState();

  it("aggregates answered/correct/rounds and tracks best streak", () => {
    let s = recordRound(base(), { ks: "ks2", subject: "maths", topic: "Fractions", total: 10, correct: 7, bestStreak: 4 });
    s = recordRound(s, { ks: "ks2", subject: "maths", topic: "Fractions", total: 10, correct: 9, bestStreak: 6 });
    const cell = s.stats["ks2:maths"];
    expect(cell.answered).toBe(20);
    expect(cell.correct).toBe(16);
    expect(cell.rounds).toBe(2);
    expect(cell.bestStreak).toBe(6); // max of 4 and 6
    expect(cell.byTopic.Fractions).toEqual({ answered: 20, correct: 16 });
  });

  it("keeps separate topics under the same subject", () => {
    let s = recordRound(base(), { ks: "ks2", subject: "maths", topic: "Fractions", total: 5, correct: 5, bestStreak: 5 });
    s = recordRound(s, { ks: "ks2", subject: "maths", topic: "Division", total: 5, correct: 2, bestStreak: 1 });
    expect(Object.keys(s.stats["ks2:maths"].byTopic)).toEqual(["Fractions", "Division"]);
  });

  it("prepends to history and caps it at 60", () => {
    let s = base();
    for (let i = 0; i < 65; i++) {
      s = recordRound(s, { ks: "ks2", subject: "maths", topic: "T" + i, total: 1, correct: 1, bestStreak: 1 });
    }
    expect(s.history).toHaveLength(60);
    expect(s.history[0].topic).toBe("T64"); // most recent first
  });
});

describe("overview", () => {
  it("computes totals and accuracy", () => {
    let s = defaultState();
    s = recordRound(s, { ks: "ks2", subject: "maths", topic: "Fractions", total: 10, correct: 5, bestStreak: 3 });
    s = recordRound(s, { ks: "ks3", subject: "science", topic: "Energy", total: 10, correct: 10, bestStreak: 8 });
    const ov = overview(s);
    expect(ov.answered).toBe(20);
    expect(ov.correct).toBe(15);
    expect(ov.rounds).toBe(2);
    expect(ov.best).toBe(8);
    expect(ov.accuracy).toBe(75);
  });

  it("reports 0% accuracy with no answers", () => {
    expect(overview(defaultState()).accuracy).toBe(0);
  });
});

describe("weakestTopics", () => {
  it("ignores topics with fewer than 3 attempts", () => {
    let s = defaultState();
    s = recordRound(s, { ks: "ks2", subject: "maths", topic: "Barely", total: 2, correct: 0, bestStreak: 0 });
    expect(weakestTopics(s)).toHaveLength(0);
  });

  it("returns lowest-accuracy topics first, limited", () => {
    let s = defaultState();
    s = recordRound(s, { ks: "ks2", subject: "maths", topic: "Weak", total: 10, correct: 2, bestStreak: 0 });
    s = recordRound(s, { ks: "ks2", subject: "maths", topic: "Mid", total: 10, correct: 5, bestStreak: 0 });
    s = recordRound(s, { ks: "ks2", subject: "maths", topic: "Strong", total: 10, correct: 9, bestStreak: 0 });
    const weak = weakestTopics(s, 2);
    expect(weak).toHaveLength(2);
    expect(weak[0].topic).toBe("Weak");
    expect(weak[0].accuracy).toBe(20);
    expect(weak[1].topic).toBe("Mid");
  });
});

describe("recordCourseResult", () => {
  it("prepends a timestamped result and caps at 50", () => {
    let s = defaultState();
    for (let i = 0; i < 55; i++) s = recordCourseResult(s, { course: "Gas", score: i });
    expect(s.courses).toHaveLength(50);
    expect(s.courses[0].score).toBe(54);
    expect(typeof s.courses[0].ts).toBe("number");
  });
});
