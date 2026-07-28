import { describe, expect, it } from "vitest";
import type { Question } from "./questions";
import {
  answerQuestion,
  createRound,
  currentQuestion,
  isComplete,
  NotEnoughQuestionsError,
  PASS_MARK,
  ROUND_SIZE,
  scoreRound,
  type Round,
} from "./round";

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

describe("createRound", () => {
  it("deals exactly 15 questions", () => {
    expect(createRound("ks2", 1).questions).toHaveLength(ROUND_SIZE);
  });

  it("only deals questions from the requested stage", () => {
    const round = createRound("ks3", 1);
    expect(round.questions.every((question) => question.stage === "ks3")).toBe(true);
  });

  it("never repeats a question within a round", () => {
    const ids = createRound("he", 5).questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ROUND_SIZE);
  });

  it("is reproducible from its seed", () => {
    const a = createRound("ks1", 2024).questions.map((question) => question.id);
    const b = createRound("ks1", 2024).questions.map((question) => question.id);
    expect(a).toEqual(b);
  });

  it("varies with the seed", () => {
    const a = createRound("ks2", 1).questions.map((question) => question.id);
    const b = createRound("ks2", 99).questions.map((question) => question.id);
    expect(a).not.toEqual(b);
  });

  it("throws when the bank is too thin for a full round", () => {
    const thinBank: Question[] = [
      { id: "x", stage: "ks1", subject: "Maths", prompt: "1 + 1?", choices: ["1", "2"], answerIndex: 1 },
    ];
    expect(() => createRound("ks1", 1, thinBank)).toThrow(NotEnoughQuestionsError);
  });

  it("starts with no answers", () => {
    const round = createRound("ks1", 1);
    expect(round.answers).toEqual([]);
    expect(isComplete(round)).toBe(false);
  });
});

describe("answerQuestion", () => {
  it("advances to the next question", () => {
    const round = createRound("ks2", 4);
    const first = currentQuestion(round);
    const next = answerQuestion(round, 0);
    expect(currentQuestion(next)?.id).not.toBe(first?.id);
    expect(next.answers).toHaveLength(1);
  });

  it("does not mutate the previous round", () => {
    const round = createRound("ks2", 4);
    answerQuestion(round, 0);
    expect(round.answers).toHaveLength(0);
  });

  it("marks the right answer correct and the wrong answer incorrect", () => {
    const round = createRound("ks2", 4);
    const question = currentQuestion(round)!;
    const wrongIndex = question.answerIndex === 0 ? 1 : 0;
    expect(answerQuestion(round, question.answerIndex).answers[0].correct).toBe(true);
    expect(answerQuestion(round, wrongIndex).answers[0].correct).toBe(false);
  });

  it("rejects out-of-range choices", () => {
    const round = createRound("ks1", 1);
    expect(() => answerQuestion(round, -1)).toThrow(RangeError);
    expect(() => answerQuestion(round, 99)).toThrow(RangeError);
  });

  it("refuses answers once the round is complete", () => {
    const finished = playRound(createRound("ks1", 1), ROUND_SIZE);
    expect(isComplete(finished)).toBe(true);
    expect(currentQuestion(finished)).toBeUndefined();
    expect(() => answerQuestion(finished, 0)).toThrow("Round is already complete");
  });
});

describe("scoreRound", () => {
  it("scores a perfect round", () => {
    const score = scoreRound(playRound(createRound("ks2", 8), ROUND_SIZE));
    expect(score).toEqual({ correct: 15, total: 15, percentage: 100, passed: true });
  });

  it("scores a blank round", () => {
    const score = scoreRound(playRound(createRound("ks2", 8), 0));
    expect(score).toEqual({ correct: 0, total: 15, percentage: 0, passed: false });
  });

  it("rounds the percentage to a whole number", () => {
    // 10 / 15 = 66.67%
    expect(scoreRound(playRound(createRound("ks3", 2), 10)).percentage).toBe(67);
  });

  it("passes at the pass mark and fails just below it", () => {
    // 9 / 15 = 60%, 8 / 15 = 53%
    const atMark = scoreRound(playRound(createRound("ks3", 2), 9));
    const belowMark = scoreRound(playRound(createRound("ks3", 2), 8));
    expect(atMark.percentage).toBe(PASS_MARK);
    expect(atMark.passed).toBe(true);
    expect(belowMark.passed).toBe(false);
  });

  it("reports zero rather than NaN for an empty round", () => {
    const empty: Round = { stage: "ks1", seed: 0, questions: [], answers: [] };
    expect(scoreRound(empty).percentage).toBe(0);
  });
});
