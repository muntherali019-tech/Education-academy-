import { describe, it, expect } from "vitest";
import { STAGES } from "./stages";
import { QUESTIONS, ROUND_LENGTH } from "./questions";
import type { StageId } from "../types";

// The question bank and stage list are pure content, but the quiz trusts their
// shape completely: Quiz slices ROUND_LENGTH questions and indexes
// question.choices[question.answer] without checking. A malformed entry would
// surface as a blank or wrong answer in front of a learner, not as a crash.

const IDS: StageId[] = ["ks1", "ks2", "ks3", "higher"];

describe("STAGES", () => {
  it("covers every stage id exactly once", () => {
    expect(STAGES.map((s) => s.id)).toEqual(IDS);
  });

  it("gives every stage the copy the picker renders", () => {
    for (const s of STAGES) {
      expect(s.name, `${s.id} name`).toBeTruthy();
      expect(s.ages, `${s.id} ages`).toBeTruthy();
      expect(s.blurb, `${s.id} blurb`).toBeTruthy();
      expect(s.emoji, `${s.id} emoji`).toBeTruthy();
    }
  });
});

describe("QUESTIONS", () => {
  it("has a bank for every stage", () => {
    expect(Object.keys(QUESTIONS).sort()).toEqual([...IDS].sort());
  });

  it("holds at least a full round per stage", () => {
    for (const id of IDS) {
      expect(QUESTIONS[id].length, `${id} bank`).toBeGreaterThanOrEqual(ROUND_LENGTH);
    }
  });

  it("has well-formed questions with an in-range answer", () => {
    for (const id of IDS) {
      QUESTIONS[id].forEach((q, i) => {
        const at = `${id}[${i}]`;
        expect(q.prompt.trim(), `${at} prompt`).not.toBe("");
        expect(q.choices.length, `${at} choices`).toBe(4);
        for (const c of q.choices) expect(String(c).trim(), `${at} choice`).not.toBe("");
        expect(Number.isInteger(q.answer), `${at} answer is an index`).toBe(true);
        expect(q.answer, `${at} answer in range`).toBeGreaterThanOrEqual(0);
        expect(q.answer, `${at} answer in range`).toBeLessThan(q.choices.length);
        // Quiz shows the hint on a wrong answer, so an empty one is a dead end.
        expect(q.hint.trim(), `${at} hint`).not.toBe("");
      });
    }
  });

  it("does not repeat a prompt within a stage", () => {
    for (const id of IDS) {
      const prompts = QUESTIONS[id].map((q) => q.prompt);
      expect(new Set(prompts).size, `${id} has duplicate prompts`).toBe(prompts.length);
    }
  });

  it("does not put every correct answer in the same position", () => {
    for (const id of IDS) {
      const positions = new Set(QUESTIONS[id].map((q) => q.answer));
      expect(positions.size, `${id} is guessable`).toBeGreaterThan(1);
    }
  });
});
