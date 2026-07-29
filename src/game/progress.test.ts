import { describe, expect, it } from "vitest";
import {
  accuracy,
  allStageSummaries,
  createProgress,
  entriesForStage,
  entryFromRound,
  MAX_ENTRIES,
  recordRound,
  stageSummary,
  subjectTotals,
  type Progress,
} from "./progress";
import { answerQuestion, createRound, ROUND_SIZE, type Round } from "./round";
import { STAGE_IDS, type StageId } from "./stages";

/** Answers every remaining question, marking the first `correctCount` right. */
function playRound(round: Round, correctCount: number): Round {
  let played = round;
  for (let i = 0; i < round.questions.length; i++) {
    const question = round.questions[i];
    const wrongIndex = question.answerIndex === 0 ? 1 : 0;
    played = answerQuestion(played, i < correctCount ? question.answerIndex : wrongIndex);
  }
  return played;
}

function progressWith(
  rounds: Array<{ stage: StageId; seed: number; correct: number; at?: number }>,
): Progress {
  return rounds.reduce(
    (progress, { stage, seed, correct, at }) =>
      recordRound(progress, playRound(createRound(stage, seed), correct), at ?? seed),
    createProgress(),
  );
}

describe("createProgress", () => {
  it("starts empty", () => {
    expect(createProgress().entries).toEqual([]);
  });
});

describe("entryFromRound", () => {
  it("captures the round's score, stage and seed", () => {
    const entry = entryFromRound(playRound(createRound("ks2", 8), ROUND_SIZE), 1_700_000_000_000);
    expect(entry).toMatchObject({
      stage: "ks2",
      seed: 8,
      correct: ROUND_SIZE,
      total: ROUND_SIZE,
      percentage: 100,
      passed: true,
      completedAt: 1_700_000_000_000,
    });
  });

  it("tallies each subject the round covered", () => {
    const round = playRound(createRound("ks1", 3), ROUND_SIZE);
    const entry = entryFromRound(round, 0);

    const attempted = entry.subjects.reduce((total, tally) => total + tally.total, 0);
    expect(attempted).toBe(ROUND_SIZE);
    expect(entry.subjects.every((tally) => tally.correct === tally.total)).toBe(true);
    expect(new Set(entry.subjects.map((tally) => tally.subject)).size).toBe(entry.subjects.length);
  });

  it("counts wrong answers against the subject", () => {
    const entry = entryFromRound(playRound(createRound("ks3", 2), 0), 0);
    expect(entry.subjects.every((tally) => tally.correct === 0)).toBe(true);
    expect(entry.subjects.reduce((total, tally) => total + tally.total, 0)).toBe(ROUND_SIZE);
  });
});

describe("recordRound", () => {
  it("appends a finished round", () => {
    const progress = recordRound(createProgress(), playRound(createRound("ks1", 1), 12), 5);
    expect(progress.entries).toHaveLength(1);
    expect(progress.entries[0]).toMatchObject({ stage: "ks1", correct: 12, completedAt: 5 });
  });

  it("does not mutate the progress it was given", () => {
    const before = createProgress();
    recordRound(before, playRound(createRound("ks1", 1), 12), 5);
    expect(before.entries).toEqual([]);
  });

  it("ignores a round that was quit part way through", () => {
    let halfPlayed = createRound("ks1", 1);
    for (let i = 0; i < 3; i++) {
      halfPlayed = answerQuestion(halfPlayed, 0);
    }
    expect(recordRound(createProgress(), halfPlayed, 1).entries).toEqual([]);
  });

  it("records a finished round even when every answer was wrong", () => {
    const allWrong = playRound(createRound("ks1", 1), 0);
    expect(recordRound(createProgress(), allWrong, 1).entries).toHaveLength(1);
  });

  it("ignores an empty round", () => {
    const empty: Round = { stage: "ks1", seed: 0, questions: [], answers: [] };
    expect(recordRound(createProgress(), empty, 1).entries).toEqual([]);
  });

  it("keeps only the most recent MAX_ENTRIES rounds", () => {
    let progress = createProgress();
    const round = playRound(createRound("ks1", 1), ROUND_SIZE);
    for (let i = 0; i < MAX_ENTRIES + 5; i++) {
      progress = recordRound(progress, round, i);
    }
    expect(progress.entries).toHaveLength(MAX_ENTRIES);
    expect(progress.entries[0].completedAt).toBe(5);
    expect(progress.entries.at(-1)?.completedAt).toBe(MAX_ENTRIES + 4);
  });
});

describe("entriesForStage", () => {
  it("returns only that stage's rounds", () => {
    const progress = progressWith([
      { stage: "ks1", seed: 1, correct: 15 },
      { stage: "ks2", seed: 2, correct: 10 },
      { stage: "ks1", seed: 3, correct: 5 },
    ]);
    expect(entriesForStage(progress, "ks1").map((entry) => entry.seed)).toEqual([1, 3]);
    expect(entriesForStage(progress, "he")).toEqual([]);
  });
});

describe("stageSummary", () => {
  it("reports zeroes for a stage that was never played", () => {
    expect(stageSummary(createProgress(), "ks3")).toEqual({
      stage: "ks3",
      roundsPlayed: 0,
      roundsPassed: 0,
      bestPercentage: 0,
      averagePercentage: 0,
      lastPlayedAt: null,
    });
  });

  it("counts rounds played and passed", () => {
    // 15/15 = 100% (pass), 9/15 = 60% (pass), 3/15 = 20% (fail).
    const progress = progressWith([
      { stage: "ks2", seed: 1, correct: 15, at: 100 },
      { stage: "ks2", seed: 2, correct: 9, at: 200 },
      { stage: "ks2", seed: 3, correct: 3, at: 300 },
      { stage: "ks1", seed: 4, correct: 15, at: 400 },
    ]);
    expect(stageSummary(progress, "ks2")).toEqual({
      stage: "ks2",
      roundsPlayed: 3,
      roundsPassed: 2,
      bestPercentage: 100,
      averagePercentage: 60,
      lastPlayedAt: 300,
    });
  });

  it("takes the latest timestamp even when rounds arrive out of order", () => {
    const progress = progressWith([
      { stage: "he", seed: 1, correct: 15, at: 900 },
      { stage: "he", seed: 2, correct: 15, at: 100 },
    ]);
    expect(stageSummary(progress, "he").lastPlayedAt).toBe(900);
  });
});

describe("allStageSummaries", () => {
  it("covers every stage in curriculum order, played or not", () => {
    const progress = progressWith([{ stage: "ks2", seed: 1, correct: 15 }]);
    const summaries = allStageSummaries(progress);
    expect(summaries.map((summary) => summary.stage)).toEqual([...STAGE_IDS]);
    expect(summaries.filter((summary) => summary.roundsPlayed > 0)).toHaveLength(1);
  });
});

describe("subjectTotals", () => {
  it("is empty before anything is played", () => {
    expect(subjectTotals(createProgress())).toEqual([]);
  });

  it("rolls subjects up across rounds", () => {
    const progress = progressWith([
      { stage: "ks1", seed: 1, correct: ROUND_SIZE },
      { stage: "ks1", seed: 1, correct: ROUND_SIZE },
    ]);
    const totals = subjectTotals(progress);
    expect(totals.reduce((sum, tally) => sum + tally.total, 0)).toBe(ROUND_SIZE * 2);
    expect(totals.every((tally) => tally.correct === tally.total)).toBe(true);
  });

  it("narrows to one stage when asked", () => {
    const progress = progressWith([
      { stage: "ks1", seed: 1, correct: ROUND_SIZE },
      { stage: "he", seed: 2, correct: ROUND_SIZE },
    ]);
    const heSubjects = subjectTotals(progress, "he").map((tally) => tally.subject);
    expect(heSubjects).not.toContain("English");
    expect(subjectTotals(progress, "he").reduce((sum, t) => sum + t.total, 0)).toBe(ROUND_SIZE);
  });

  it("sorts strongest subject first", () => {
    const progress = progressWith([
      { stage: "ks1", seed: 1, correct: ROUND_SIZE },
      { stage: "ks1", seed: 1, correct: 0 },
      { stage: "ks3", seed: 4, correct: 0 },
    ]);
    const scores = subjectTotals(progress).map(accuracy);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});

describe("accuracy", () => {
  it("rounds to a whole percentage", () => {
    expect(accuracy({ subject: "Maths", correct: 2, total: 3 })).toBe(67);
    expect(accuracy({ subject: "Maths", correct: 3, total: 3 })).toBe(100);
  });

  it("reports zero rather than NaN when nothing was attempted", () => {
    expect(accuracy({ subject: "Maths", correct: 0, total: 0 })).toBe(0);
  });
});
