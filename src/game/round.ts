import { QUESTION_BANK, questionsForStage, type Question } from "./questions";
import { seededRng, shuffle } from "./random";
import type { StageId } from "./stages";

/** Every puzzle round is 15 questions. */
export const ROUND_SIZE = 15;

/** Percentage needed to clear a round and earn a paw print. */
export const PASS_MARK = 60;

export interface Answer {
  questionId: string;
  choiceIndex: number;
  correct: boolean;
}

export interface Round {
  stage: StageId;
  seed: number;
  questions: Question[];
  answers: Answer[];
}

export interface RoundScore {
  correct: number;
  total: number;
  /** Whole percentage, rounded to the nearest point. */
  percentage: number;
  passed: boolean;
}

export class NotEnoughQuestionsError extends Error {
  constructor(stage: StageId, available: number) {
    super(`Stage "${stage}" has ${available} questions, needs ${ROUND_SIZE}`);
    this.name = "NotEnoughQuestionsError";
  }
}

/**
 * Build a fresh round. The same seed always yields the same questions in the
 * same order, so a round can be replayed or shared.
 */
export function createRound(
  stage: StageId,
  seed: number = Date.now(),
  bank: Question[] = QUESTION_BANK,
): Round {
  const pool = questionsForStage(stage, bank);
  if (pool.length < ROUND_SIZE) {
    throw new NotEnoughQuestionsError(stage, pool.length);
  }
  return {
    stage,
    seed,
    questions: shuffle(pool, seededRng(seed)).slice(0, ROUND_SIZE),
    answers: [],
  };
}

export function currentQuestion(round: Round): Question | undefined {
  return round.questions[round.answers.length];
}

export function isComplete(round: Round): boolean {
  return round.answers.length >= round.questions.length;
}

/**
 * Record an answer for the current question. Returns a new round — the input
 * is never mutated.
 */
export function answerQuestion(round: Round, choiceIndex: number): Round {
  const question = currentQuestion(round);
  if (!question) {
    throw new Error("Round is already complete");
  }
  if (choiceIndex < 0 || choiceIndex >= question.choices.length) {
    throw new RangeError(
      `Choice ${choiceIndex} is out of range for question "${question.id}"`,
    );
  }
  const answer: Answer = {
    questionId: question.id,
    choiceIndex,
    correct: choiceIndex === question.answerIndex,
  };
  return { ...round, answers: [...round.answers, answer] };
}

export function scoreRound(round: Round): RoundScore {
  const correct = round.answers.filter((answer) => answer.correct).length;
  const total = round.questions.length;
  const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, percentage, passed: percentage >= PASS_MARK };
}
