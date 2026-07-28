import { describe, expect, it } from "vitest";
import {
  isRoundResult,
  RECENT_LIMIT,
  recentResults,
  resultFromRound,
  summariseProgress,
  summariseStage,
  type RoundResult,
} from "./progress";
import { answerQuestion, createRound, ROUND_SIZE, type Round } from "./round";
import type { StageId } from "./stages";

function result(
  stage: StageId,
  percentage: number,
  completedAt: string,
): RoundResult {
  const correct = Math.round((percentage / 100) * ROUND_SIZE);
  return {
    stage,
    seed: 1,
    correct,
    total: ROUND_SIZE,
    percentage,
    passed: percentage >= 60,
    completedAt,
  };
}

/** Plays a full round, getting the first `correctCount` questions right. */
function playRound(stage: StageId, correctCount: number): Round {
  let round = createRound(stage, 1);
  for (let i = 0; i < ROUND_SIZE; i++) {
    const question = round.questions[i];
    const wrongIndex = question.answerIndex === 0 ? 1 : 0;
    round = answerQuestion(round, i < correctCount ? question.answerIndex : wrongIndex);
  }
  return round;
}

describe("resultFromRound", () => {
  it("flattens a finished round", () => {
    const finished = playRound("ks2", ROUND_SIZE);
    const recorded = resultFromRound(finished, "2026-01-01T10:00:00.000Z");

    expect(recorded).toEqual({
      stage: "ks2",
      seed: 1,
      correct: 15,
      total: 15,
      percentage: 100,
      passed: true,
      completedAt: "2026-01-01T10:00:00.000Z",
    });
  });

  it("records a failed round as not passed", () => {
    const recorded = resultFromRound(playRound("ks1", 3), "2026-01-01T10:00:00.000Z");
    expect(recorded.percentage).toBe(20);
    expect(recorded.passed).toBe(false);
  });

  it("refuses to record an unfinished round", () => {
    const unfinished = answerQuestion(createRound("ks1", 1), 0);
    expect(() => resultFromRound(unfinished, "2026-01-01T10:00:00.000Z")).toThrow(
      "not complete",
    );
  });
});

describe("recentResults", () => {
  const history = [
    result("ks1", 50, "2026-01-01T10:00:00.000Z"),
    result("ks1", 60, "2026-01-02T10:00:00.000Z"),
    result("ks1", 70, "2026-01-03T10:00:00.000Z"),
  ];

  it("returns most recent first", () => {
    expect(recentResults(history).map((r) => r.percentage)).toEqual([70, 60, 50]);
  });

  it("caps at the limit", () => {
    expect(recentResults(history, 2).map((r) => r.percentage)).toEqual([70, 60]);
  });

  it("does not mutate the input", () => {
    const before = history.map((r) => r.percentage);
    recentResults(history);
    expect(history.map((r) => r.percentage)).toEqual(before);
  });

  it("handles empty history and non-positive limits", () => {
    expect(recentResults([])).toEqual([]);
    expect(recentResults(history, 0)).toEqual([]);
    expect(recentResults(history, -1)).toEqual([]);
  });

  it("defaults to RECENT_LIMIT", () => {
    const long = Array.from({ length: RECENT_LIMIT + 5 }, (_, i) =>
      result("ks1", 50, `2026-01-${String(i + 1).padStart(2, "0")}T10:00:00.000Z`),
    );
    expect(recentResults(long)).toHaveLength(RECENT_LIMIT);
  });
});

describe("summariseStage", () => {
  it("reports an unplayed stage with nulls rather than zeroes", () => {
    expect(summariseStage([], "ks3")).toEqual({
      stage: "ks3",
      roundsPlayed: 0,
      roundsPassed: 0,
      bestPercentage: null,
      averagePercentage: null,
      lastPlayedAt: null,
    });
  });

  it("aggregates only rounds for that stage", () => {
    const history = [
      result("ks1", 40, "2026-01-01T10:00:00.000Z"),
      result("ks2", 100, "2026-01-02T10:00:00.000Z"),
      result("ks1", 80, "2026-01-03T10:00:00.000Z"),
    ];
    const summary = summariseStage(history, "ks1");

    expect(summary.roundsPlayed).toBe(2);
    expect(summary.roundsPassed).toBe(1);
    expect(summary.bestPercentage).toBe(80);
    expect(summary.averagePercentage).toBe(60);
    expect(summary.lastPlayedAt).toBe("2026-01-03T10:00:00.000Z");
  });

  it("rounds the average", () => {
    const history = [
      result("ks1", 50, "2026-01-01T10:00:00.000Z"),
      result("ks1", 51, "2026-01-02T10:00:00.000Z"),
      result("ks1", 52, "2026-01-03T10:00:00.000Z"),
    ];
    // 153 / 3 = 51
    expect(summariseStage(history, "ks1").averagePercentage).toBe(51);
  });
});

describe("summariseProgress", () => {
  it("reports empty history without dividing by zero", () => {
    const summary = summariseProgress([]);

    expect(summary.totalRounds).toBe(0);
    expect(summary.totalPassed).toBe(0);
    expect(summary.passRate).toBe(0);
    expect(summary.averagePercentage).toBe(0);
    expect(summary.recent).toEqual([]);
  });

  it("always lists all four stages in order", () => {
    expect(summariseProgress([]).byStage.map((s) => s.stage)).toEqual([
      "ks1",
      "ks2",
      "ks3",
      "he",
    ]);
  });

  it("aggregates across stages", () => {
    const history = [
      result("ks1", 100, "2026-01-01T10:00:00.000Z"),
      result("ks2", 60, "2026-01-02T10:00:00.000Z"),
      result("ks3", 20, "2026-01-03T10:00:00.000Z"),
      result("he", 40, "2026-01-04T10:00:00.000Z"),
    ];
    const summary = summariseProgress(history);

    expect(summary.totalRounds).toBe(4);
    expect(summary.totalPassed).toBe(2);
    expect(summary.passRate).toBe(50);
    expect(summary.averagePercentage).toBe(55);
  });

  it("puts the newest round first in recent", () => {
    const history = [
      result("ks1", 10, "2026-01-01T10:00:00.000Z"),
      result("ks2", 90, "2026-01-02T10:00:00.000Z"),
    ];
    expect(summariseProgress(history).recent[0].percentage).toBe(90);
  });
});

describe("isRoundResult", () => {
  const valid = result("ks1", 60, "2026-01-01T10:00:00.000Z");

  it("accepts a well-formed result", () => {
    expect(isRoundResult(valid)).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(isRoundResult(null)).toBe(false);
    expect(isRoundResult(undefined)).toBe(false);
    expect(isRoundResult("nope")).toBe(false);
    expect(isRoundResult(42)).toBe(false);
  });

  it("rejects an unknown stage", () => {
    expect(isRoundResult({ ...valid, stage: "ks9" })).toBe(false);
  });

  it("rejects missing or mistyped fields", () => {
    expect(isRoundResult({ ...valid, passed: "yes" })).toBe(false);
    expect(isRoundResult({ ...valid, completedAt: 1234 })).toBe(false);
    const { percentage: _percentage, ...withoutPercentage } = valid;
    expect(isRoundResult(withoutPercentage)).toBe(false);
  });

  it("rejects non-finite numbers", () => {
    expect(isRoundResult({ ...valid, percentage: NaN })).toBe(false);
    expect(isRoundResult({ ...valid, seed: Infinity })).toBe(false);
  });
});
