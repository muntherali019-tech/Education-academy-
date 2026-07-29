import { LearnerError } from "../errors";
import type { PhotoRequest } from "../photo/photo";

/** One step of the worked solution. */
export interface SolutionStep {
  /** What to do and why, in a sentence or two. */
  explanation: string;
  /** The maths or working for this step; may be empty for a purely verbal step. */
  working: string;
}

export interface Solution {
  /** The problem as read from the photo; empty when none could be read. */
  problem: string;
  steps: SolutionStep[];
  answer: string;
  /** A similar problem to try next; empty when one would not help. */
  practice: string;
}

export type SolveRequest = PhotoRequest;

/** Anything that can solve a photographed problem — the endpoint, or a fake. */
export type Solver = (request: SolveRequest) => Promise<Solution>;

export class SolveError extends LearnerError {
  constructor(message: string) {
    super(message, "SolveError");
  }
}

export const MAX_SOLUTION_STEPS = 12;

/** True when the photo produced nothing worth showing. */
export function isEmptySolution(solution: Solution): boolean {
  return solution.problem === "" || solution.steps.length === 0;
}

export const SOLUTION_SCHEMA = {
  type: "object",
  properties: {
    problem: {
      type: "string",
      description:
        "The problem exactly as it appears in the photo. Use an empty string if no problem can be read.",
    },
    steps: {
      type: "array",
      description:
        "The worked solution, one step at a time, in the order a learner should follow. Empty if no problem can be read.",
      items: {
        type: "object",
        properties: {
          explanation: {
            type: "string",
            description: "What to do in this step and why, addressed to the learner.",
          },
          working: {
            type: "string",
            description: "The working for this step, or an empty string if there is none.",
          },
        },
        required: ["explanation", "working"],
        additionalProperties: false,
      },
    },
    answer: {
      type: "string",
      description: "The final answer on its own. Empty if no problem can be read.",
    },
    practice: {
      type: "string",
      description:
        "A similar problem for the learner to try next, or an empty string if one would not help.",
    },
  },
  required: ["problem", "steps", "answer", "practice"],
  additionalProperties: false,
} as const;

function parseStep(value: unknown): SolutionStep | null {
  const step = value as Record<string, unknown>;
  if (typeof step?.explanation !== "string" || typeof step.working !== "string") {
    return null;
  }
  return { explanation: step.explanation, working: step.working };
}

/**
 * Validate a solution that arrived over the wire. A malformed step rejects the
 * whole solution rather than showing a learner half a method.
 */
export function parseSolution(value: unknown): Solution | null {
  const solution = value as Record<string, unknown>;
  if (
    typeof solution?.problem !== "string" ||
    typeof solution.answer !== "string" ||
    typeof solution.practice !== "string" ||
    !Array.isArray(solution.steps)
  ) {
    return null;
  }
  const steps: SolutionStep[] = [];
  for (const raw of solution.steps.slice(0, MAX_SOLUTION_STEPS)) {
    const step = parseStep(raw);
    if (step === null) {
      return null;
    }
    steps.push(step);
  }
  return {
    problem: solution.problem,
    steps,
    answer: solution.answer,
    practice: solution.practice,
  };
}
