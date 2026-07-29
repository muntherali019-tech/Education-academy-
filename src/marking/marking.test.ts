import { describe, expect, it } from "vitest";
import {
  MAX_MARKED_QUESTIONS,
  parseMarkingResult,
  summariseMarking,
  type MarkedQuestion,
  type Verdict,
} from "./marking";

function item(verdict: Verdict, overrides: Partial<MarkedQuestion> = {}): MarkedQuestion {
  return {
    question: "What is 2 + 3?",
    studentAnswer: "5",
    verdict,
    comment: "Nice work.",
    ...overrides,
  };
}

describe("parseMarkingResult", () => {
  it("accepts a well-formed result", () => {
    const result = { overall: "Great page!", items: [item("correct"), item("incorrect")] };
    expect(parseMarkingResult(result)).toEqual(result);
  });

  it("accepts a page with nothing on it", () => {
    expect(parseMarkingResult({ overall: "No homework here.", items: [] })).toEqual({
      overall: "No homework here.",
      items: [],
    });
  });

  it("rejects anything that is not a marking result", () => {
    expect(parseMarkingResult(null)).toBeNull();
    expect(parseMarkingResult("nope")).toBeNull();
    expect(parseMarkingResult({ items: [] })).toBeNull();
    expect(parseMarkingResult({ overall: "Hi" })).toBeNull();
    expect(parseMarkingResult({ overall: "Hi", items: "none" })).toBeNull();
  });

  it("rejects the whole result when one item is malformed", () => {
    const withBadItem = {
      overall: "Great page!",
      items: [item("correct"), { question: "What is 2 + 3?", verdict: "correct" }],
    };
    expect(parseMarkingResult(withBadItem)).toBeNull();
  });

  it("rejects a verdict it does not recognise", () => {
    const result = { overall: "Hi", items: [{ ...item("correct"), verdict: "maybe" }] };
    expect(parseMarkingResult(result)).toBeNull();
  });

  it("caps a runaway list of questions", () => {
    const items = Array.from({ length: MAX_MARKED_QUESTIONS + 10 }, () => item("correct"));
    expect(parseMarkingResult({ overall: "Hi", items })?.items).toHaveLength(MAX_MARKED_QUESTIONS);
  });
});

describe("summariseMarking", () => {
  it("counts each verdict", () => {
    const result = {
      overall: "Good try!",
      items: [item("correct"), item("correct"), item("incorrect"), item("unclear")],
    };
    expect(summariseMarking(result)).toEqual({
      correct: 2,
      incorrect: 1,
      unclear: 1,
      total: 4,
      percentage: 50,
    });
  });

  it("rounds the percentage to a whole number", () => {
    const items = [item("correct"), item("correct"), item("incorrect")];
    expect(summariseMarking({ overall: "", items }).percentage).toBe(67);
  });

  it("reports zero rather than NaN for an empty page", () => {
    expect(summariseMarking({ overall: "", items: [] })).toEqual({
      correct: 0,
      incorrect: 0,
      unclear: 0,
      total: 0,
      percentage: 0,
    });
  });
});
