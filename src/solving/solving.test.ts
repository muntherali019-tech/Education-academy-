import { describe, expect, it } from "vitest";
import {
  isEmptySolution,
  MAX_SOLUTION_STEPS,
  parseSolution,
  type Solution,
} from "./solving";

const SOLUTION: Solution = {
  problem: "3x + 6 = 21",
  steps: [
    { explanation: "Take 6 from both sides.", working: "3x = 15" },
    { explanation: "Divide both sides by 3.", working: "x = 5" },
  ],
  answer: "x = 5",
  practice: "Try 4x + 8 = 28.",
};

describe("parseSolution", () => {
  it("accepts a well-formed solution", () => {
    expect(parseSolution(SOLUTION)).toEqual(SOLUTION);
  });

  it("accepts a photo with no problem in it", () => {
    const empty = { problem: "", steps: [], answer: "", practice: "" };
    expect(parseSolution(empty)).toEqual(empty);
  });

  it("accepts a step with no working", () => {
    const verbal = { ...SOLUTION, steps: [{ explanation: "Read the question again.", working: "" }] };
    expect(parseSolution(verbal)).toEqual(verbal);
  });

  it("rejects anything that is not a solution", () => {
    expect(parseSolution(null)).toBeNull();
    expect(parseSolution("x = 5")).toBeNull();
    expect(parseSolution({ ...SOLUTION, steps: "two steps" })).toBeNull();
    expect(parseSolution({ problem: "3x + 6 = 21" })).toBeNull();
  });

  it("rejects the whole solution when one step is malformed", () => {
    const broken = { ...SOLUTION, steps: [SOLUTION.steps[0], { explanation: "Divide by 3." }] };
    expect(parseSolution(broken)).toBeNull();
  });

  it("caps a runaway list of steps", () => {
    const steps = Array.from({ length: MAX_SOLUTION_STEPS + 5 }, () => SOLUTION.steps[0]);
    expect(parseSolution({ ...SOLUTION, steps })?.steps).toHaveLength(MAX_SOLUTION_STEPS);
  });
});

describe("isEmptySolution", () => {
  it("is false for a real solution", () => {
    expect(isEmptySolution(SOLUTION)).toBe(false);
  });

  it("is true when no problem was read", () => {
    expect(isEmptySolution({ problem: "", steps: [], answer: "", practice: "" })).toBe(true);
  });

  it("is true when a problem was read but no method came back", () => {
    expect(isEmptySolution({ ...SOLUTION, steps: [] })).toBe(true);
  });
});
