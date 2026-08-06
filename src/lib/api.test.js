import { describe, it, expect, vi, afterEach } from "vitest";
import { extractJSON, generateQuestions, examQuestions } from "./api.js";

describe("extractJSON", () => {
  it("parses plain JSON", () => {
    expect(extractJSON('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json fences", () => {
    expect(extractJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("strips bare ``` fences", () => {
    expect(extractJSON('```\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it("ignores leading and trailing prose", () => {
    expect(extractJSON('Sure! Here you go:\n{"ok":true}\nHope that helps.')).toEqual({ ok: true });
  });

  it("handles nested objects by slicing to the outer braces", () => {
    expect(extractJSON('noise {"a":{"b":[1,2]}} trailing')).toEqual({ a: { b: [1, 2] } });
  });

  it("throws on input with no JSON object", () => {
    expect(() => extractJSON("no json here")).toThrow();
  });

  it("throws on empty / null input", () => {
    expect(() => extractJSON("")).toThrow();
    expect(() => extractJSON(null)).toThrow();
  });
});

// generateQuestions / examQuestions call the backend via fetch; stub it.
function mockClaudeText(text) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ type: "text", text }] }),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateQuestions", () => {
  it("returns only well-formed 4-choice questions, capped at count", async () => {
    const payload = JSON.stringify({
      questions: [
        { question: "Q1", choices: ["a", "b", "c", "d"], answerIndex: 0, explanation: "e" },
        { question: "Bad", choices: ["a", "b"], answerIndex: 0 }, // dropped: not 4 choices
        { question: "Q2", choices: ["a", "b", "c", "d"], answerIndex: 2, explanation: "e" },
      ],
    });
    vi.stubGlobal("fetch", mockClaudeText(payload));
    const qs = await generateQuestions({ ks: "ks2", subject: "maths", topic: "Fractions", count: 5 });
    expect(qs).toHaveLength(2);
    expect(qs.every((q) => q.choices.length === 4)).toBe(true);
  });

  it("slices to the requested count", async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      question: "Q" + i, choices: ["a", "b", "c", "d"], answerIndex: 0, explanation: "e",
    }));
    vi.stubGlobal("fetch", mockClaudeText(JSON.stringify({ questions: many })));
    const qs = await generateQuestions({ ks: "ks2", subject: "maths", topic: "T", count: 3 });
    expect(qs).toHaveLength(3);
  });

  it("throws when the backend responds non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    await expect(generateQuestions({ ks: "ks2", subject: "maths", topic: "T" })).rejects.toThrow("API 500");
  });
});

describe("examQuestions", () => {
  it("returns the quiz array", async () => {
    const payload = JSON.stringify({ quiz: [{ q: "Q", options: ["a", "b", "c", "d"], answerIndex: 1, why: "w" }] });
    vi.stubGlobal("fetch", mockClaudeText(payload));
    const quiz = await examQuestions({ course: "Gas", modules: ["A"], count: 1 });
    expect(quiz).toHaveLength(1);
    expect(quiz[0].q).toBe("Q");
  });

  it("returns [] when the payload has no quiz", async () => {
    vi.stubGlobal("fetch", mockClaudeText(JSON.stringify({ nope: true })));
    const quiz = await examQuestions({ course: "Gas", modules: [], count: 1 });
    expect(quiz).toEqual([]);
  });
});
