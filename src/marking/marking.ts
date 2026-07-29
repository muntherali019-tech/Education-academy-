import { LearnerError } from "../errors";
import type { PhotoRequest } from "../photo/photo";

/** How one question came out. `unclear` means the photo could not be read. */
export type Verdict = "correct" | "incorrect" | "unclear";

export const VERDICTS: readonly Verdict[] = ["correct", "incorrect", "unclear"];

export interface MarkedQuestion {
  /** The question as it appears on the page. */
  question: string;
  /** What the learner wrote. */
  studentAnswer: string;
  verdict: Verdict;
  /** One or two sentences from Mochi, addressed to the learner. */
  comment: string;
}

export interface MarkingResult {
  /** A short, encouraging summary of the whole page. */
  overall: string;
  items: MarkedQuestion[];
}

export interface MarkingSummary {
  correct: number;
  incorrect: number;
  unclear: number;
  total: number;
  /** Whole percentage of questions marked correct; 0 when nothing was read. */
  percentage: number;
}

/** What the browser sends to the marking endpoint. */
export type MarkingRequest = PhotoRequest;

/** Anything that can mark a photo — the real endpoint, or a fake in tests. */
export type Marker = (request: MarkingRequest) => Promise<MarkingResult>;

/** A marking failure a learner should see, rather than a stack trace. */
export class MarkingError extends LearnerError {
  constructor(message: string) {
    super(message, "MarkingError");
  }
}

export const MAX_MARKED_QUESTIONS = 30;

/**
 * The shape the model must answer in. Shared by the request builder and the
 * validator below, so the contract is stated once.
 */
export const MARKING_SCHEMA = {
  type: "object",
  properties: {
    overall: {
      type: "string",
      description: "One or two encouraging sentences about the page as a whole.",
    },
    items: {
      type: "array",
      description: "One entry per question visible on the page, in page order.",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "The question as printed." },
          studentAnswer: {
            type: "string",
            description: "Exactly what the learner wrote, or an empty string if nothing was written.",
          },
          verdict: {
            type: "string",
            enum: VERDICTS,
            description: "Use 'unclear' when the handwriting or photo cannot be read confidently.",
          },
          comment: {
            type: "string",
            description: "One or two sentences addressed to the learner.",
          },
        },
        required: ["question", "studentAnswer", "verdict", "comment"],
        additionalProperties: false,
      },
    },
  },
  required: ["overall", "items"],
  additionalProperties: false,
} as const;

function isVerdict(value: unknown): value is Verdict {
  return typeof value === "string" && (VERDICTS as readonly string[]).includes(value);
}

function parseItem(value: unknown): MarkedQuestion | null {
  const item = value as Record<string, unknown>;
  if (
    typeof item?.question !== "string" ||
    typeof item.studentAnswer !== "string" ||
    typeof item.comment !== "string" ||
    !isVerdict(item.verdict)
  ) {
    return null;
  }
  return {
    question: item.question,
    studentAnswer: item.studentAnswer,
    verdict: item.verdict,
    comment: item.comment,
  };
}

/**
 * Validate marking that arrived over the wire. Structured outputs make the
 * shape very likely to be right, but this is learner-facing, so nothing is
 * trusted: a malformed item is rejected rather than half-rendered.
 */
export function parseMarkingResult(value: unknown): MarkingResult | null {
  const result = value as Record<string, unknown>;
  if (typeof result?.overall !== "string" || !Array.isArray(result.items)) {
    return null;
  }
  const items: MarkedQuestion[] = [];
  for (const raw of result.items.slice(0, MAX_MARKED_QUESTIONS)) {
    const item = parseItem(raw);
    if (item === null) {
      return null;
    }
    items.push(item);
  }
  return { overall: result.overall, items };
}

export function summariseMarking(result: MarkingResult): MarkingSummary {
  const count = (verdict: Verdict) =>
    result.items.filter((item) => item.verdict === verdict).length;
  const total = result.items.length;
  const correct = count("correct");
  return {
    correct,
    incorrect: count("incorrect"),
    unclear: count("unclear"),
    total,
    percentage: total === 0 ? 0 : Math.round((correct / total) * 100),
  };
}
