import { isComplete, PASS_MARK, scoreRound, type Round } from "./round";
import { ALL_STAGES, isStageId, type StageId } from "./stages";

/** How many recent rounds the dashboard lists. */
export const RECENT_LIMIT = 10;

/**
 * A finished round, flattened for storage. The score is stored rather than
 * recomputed so that history stays meaningful even if the question bank
 * changes underneath it.
 */
export interface RoundResult {
  stage: StageId;
  seed: number;
  correct: number;
  total: number;
  percentage: number;
  passed: boolean;
  /** ISO 8601 timestamp. */
  completedAt: string;
}

export interface StageSummary {
  stage: StageId;
  roundsPlayed: number;
  roundsPassed: number;
  /** Highest percentage scored on this stage, or null if never played. */
  bestPercentage: number | null;
  /** Mean percentage across rounds on this stage, or null if never played. */
  averagePercentage: number | null;
  lastPlayedAt: string | null;
}

export interface ProgressSummary {
  totalRounds: number;
  totalPassed: number;
  /** Percentage of rounds cleared, 0 when nothing has been played. */
  passRate: number;
  /** Mean percentage across every round, 0 when nothing has been played. */
  averagePercentage: number;
  /** One entry per stage, always all four, in stage order. */
  byStage: StageSummary[];
  /** Most recently finished first, capped at RECENT_LIMIT. */
  recent: RoundResult[];
}

/** Flatten a finished round into a storable result. */
export function resultFromRound(round: Round, completedAt: string): RoundResult {
  if (!isComplete(round)) {
    throw new Error("Cannot record a round that is not complete");
  }
  const score = scoreRound(round);
  return {
    stage: round.stage,
    seed: round.seed,
    correct: score.correct,
    total: score.total,
    percentage: score.percentage,
    passed: score.passed,
    completedAt,
  };
}

/**
 * History is append-only, so insertion order is chronological. Reading from
 * the end avoids sorting on timestamps that may tie.
 */
export function recentResults(
  history: readonly RoundResult[],
  limit: number = RECENT_LIMIT,
): RoundResult[] {
  if (limit <= 0) {
    return [];
  }
  return history.slice(-limit).reverse();
}

export function summariseStage(
  history: readonly RoundResult[],
  stage: StageId,
): StageSummary {
  const rounds = history.filter((result) => result.stage === stage);
  if (rounds.length === 0) {
    return {
      stage,
      roundsPlayed: 0,
      roundsPassed: 0,
      bestPercentage: null,
      averagePercentage: null,
      lastPlayedAt: null,
    };
  }
  const percentages = rounds.map((result) => result.percentage);
  return {
    stage,
    roundsPlayed: rounds.length,
    roundsPassed: rounds.filter((result) => result.passed).length,
    bestPercentage: Math.max(...percentages),
    averagePercentage: mean(percentages),
    lastPlayedAt: rounds[rounds.length - 1].completedAt,
  };
}

export function summariseProgress(history: readonly RoundResult[]): ProgressSummary {
  const totalPassed = history.filter((result) => result.passed).length;
  return {
    totalRounds: history.length,
    totalPassed,
    passRate: history.length === 0 ? 0 : Math.round((totalPassed / history.length) * 100),
    averagePercentage: mean(history.map((result) => result.percentage)),
    byStage: ALL_STAGES.map((stage) => summariseStage(history, stage.id)),
    recent: recentResults(history),
  };
}

/**
 * Narrow untrusted data (from storage) to a RoundResult. Anything that fails
 * is dropped rather than throwing, so one bad entry cannot wipe out history.
 */
export function isRoundResult(value: unknown): value is RoundResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.stage === "string" &&
    isStageId(candidate.stage) &&
    isFiniteNumber(candidate.seed) &&
    isFiniteNumber(candidate.correct) &&
    isFiniteNumber(candidate.total) &&
    isFiniteNumber(candidate.percentage) &&
    typeof candidate.passed === "boolean" &&
    typeof candidate.completedAt === "string"
  );
}

export { PASS_MARK };

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
