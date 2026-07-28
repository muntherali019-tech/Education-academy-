import { describe, expect, it } from "vitest";
import { QUESTION_BANK, questionsForStage } from "./questions";
import { ROUND_SIZE } from "./round";
import { STAGE_IDS } from "./stages";

describe("question bank", () => {
  it("uses unique ids", () => {
    const ids = QUESTION_BANK.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(STAGE_IDS)("has enough questions for a full %s round", (stage) => {
    expect(questionsForStage(stage).length).toBeGreaterThanOrEqual(ROUND_SIZE);
  });

  it("gives every question at least two choices and a valid answer", () => {
    for (const question of QUESTION_BANK) {
      expect(question.choices.length).toBeGreaterThanOrEqual(2);
      expect(question.answerIndex).toBeGreaterThanOrEqual(0);
      expect(question.answerIndex).toBeLessThan(question.choices.length);
    }
  });

  it("gives every question a non-empty prompt and distinct choices", () => {
    for (const question of QUESTION_BANK) {
      expect(question.prompt.trim()).not.toBe("");
      expect(new Set(question.choices).size).toBe(question.choices.length);
    }
  });

  it("filters by stage", () => {
    const ks1 = questionsForStage("ks1");
    expect(ks1.length).toBeGreaterThan(0);
    expect(ks1.every((question) => question.stage === "ks1")).toBe(true);
  });
});
