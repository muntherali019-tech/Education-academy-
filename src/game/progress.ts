import { isComplete, scoreRound, type Round } from "./round";
import { STAGE_IDS, type StageId } from "./stages";

/**
 * How many rounds we keep per learner. Old rounds fall off the back so a
 * long-running device never grows an unbounded history.
 */
export const MAX_ENTRIES = 200;

/** Correct-vs-attempted for one subject inside a single round. */
export interface SubjectTally {
  subject: string;
  correct: number;
  total: number;
}

/** One finished round, as the dashboard remembers it. */
export interface ProgressEntry {
  stage: StageId;
  seed: number;
  correct: number;
  total: number;
  /** Whole percentage, matching `scoreRound`. */
  percentage: number;
  passed: boolean;
  /** Epoch milliseconds. */
  completedAt: number;
  subjects: SubjectTally[];
}

/** Oldest entry first. */
export interface Progress {
  entries: ProgressEntry[];
}

export interface StageSummary {
  stage: StageId;
  roundsPlayed: number;
  roundsPassed: number;
  /** Best and average percentage across played rounds; 0 when none played. */
  bestPercentage: number;
  averagePercentage: number;
  lastPlayedAt: number | null;
}

export function createProgress(): Progress {
  return { entries: [] };
}

/** Per-subject tallies for one round, in first-asked order. */
function subjectTallies(round: Round): SubjectTally[] {
  const tallies = new Map<string, SubjectTally>();
  round.answers.forEach((answer, index) => {
    const question = round.questions[index];
    if (!question) {
      return;
    }
    const tally = tallies.get(question.subject) ?? {
      subject: question.subject,
      correct: 0,
      total: 0,
    };
    tally.total += 1;
    if (answer.correct) {
      tally.correct += 1;
    }
    tallies.set(question.subject, tally);
  });
  return [...tallies.values()];
}

export function entryFromRound(round: Round, completedAt: number = Date.now()): ProgressEntry {
  const score = scoreRound(round);
  return {
    stage: round.stage,
    seed: round.seed,
    correct: score.correct,
    total: score.total,
    percentage: score.percentage,
    passed: score.passed,
    completedAt,
    subjects: subjectTallies(round),
  };
}

/**
 * Record a finished round. Returns new progress — the input is never mutated.
 * Unfinished rounds are ignored, so quitting half way through does not count
 * against the learner.
 */
export function recordRound(
  progress: Progress,
  round: Round,
  completedAt: number = Date.now(),
): Progress {
  if (!isComplete(round) || round.questions.length === 0) {
    return progress;
  }
  const entries = [...progress.entries, entryFromRound(round, completedAt)];
  return { entries: entries.slice(-MAX_ENTRIES) };
}

export function entriesForStage(progress: Progress, stage: StageId): ProgressEntry[] {
  return progress.entries.filter((entry) => entry.stage === stage);
}

export function stageSummary(progress: Progress, stage: StageId): StageSummary {
  const entries = entriesForStage(progress, stage);
  if (entries.length === 0) {
    return {
      stage,
      roundsPlayed: 0,
      roundsPassed: 0,
      bestPercentage: 0,
      averagePercentage: 0,
      lastPlayedAt: null,
    };
  }
  const percentages = entries.map((entry) => entry.percentage);
  const sum = percentages.reduce((total, percentage) => total + percentage, 0);
  return {
    stage,
    roundsPlayed: entries.length,
    roundsPassed: entries.filter((entry) => entry.passed).length,
    bestPercentage: Math.max(...percentages),
    averagePercentage: Math.round(sum / entries.length),
    lastPlayedAt: Math.max(...entries.map((entry) => entry.completedAt)),
  };
}

/** Every stage, in curriculum order, including stages never played. */
export function allStageSummaries(progress: Progress): StageSummary[] {
  return STAGE_IDS.map((stage) => stageSummary(progress, stage));
}

/**
 * Subject tallies rolled up across rounds, strongest first, so a parent can see
 * at a glance where the help is needed. Pass a stage to narrow the roll-up.
 */
export function subjectTotals(progress: Progress, stage?: StageId): SubjectTally[] {
  const entries = stage === undefined ? progress.entries : entriesForStage(progress, stage);
  const totals = new Map<string, SubjectTally>();
  for (const entry of entries) {
    for (const tally of entry.subjects) {
      const running = totals.get(tally.subject) ?? { subject: tally.subject, correct: 0, total: 0 };
      running.correct += tally.correct;
      running.total += tally.total;
      totals.set(tally.subject, running);
    }
  }
  return [...totals.values()].sort(
    (a, b) => accuracy(b) - accuracy(a) || a.subject.localeCompare(b.subject),
  );
}

/** Whole percentage of questions answered correctly; 0 when nothing attempted. */
export function accuracy(tally: SubjectTally): number {
  return tally.total === 0 ? 0 : Math.round((tally.correct / tally.total) * 100);
}
