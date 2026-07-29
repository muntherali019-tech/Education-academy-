import { describe, expect, it, vi } from "vitest";
import { SolveError, type Solution, type Solver } from "../src/solving/solving";
import { MAX_BASE64_LENGTH } from "./photoRequest";
import { handleSolveRequest } from "./solveHandler";

const BODY = { stage: "ks3", mediaType: "image/png", base64: "cGhvdG8=" };

const SOLUTION: Solution = {
  problem: "3x + 6 = 21",
  steps: [{ explanation: "Take 6 from both sides.", working: "3x = 15" }],
  answer: "x = 5",
  practice: "Try 4x + 8 = 28.",
};

const solvingWorks: Solver = async () => SOLUTION;

describe("handleSolveRequest", () => {
  it("returns the solution for a valid request", async () => {
    const solver = vi.fn(solvingWorks);
    expect(await handleSolveRequest(BODY, solver)).toEqual({ status: 200, body: SOLUTION });
    expect(solver).toHaveBeenCalledWith(BODY);
  });

  it("rejects a body that is missing or malformed", async () => {
    const bad = [null, "photo", {}, { ...BODY, stage: "ks9" }, { ...BODY, base64: "" }];

    for (const body of bad) {
      expect((await handleSolveRequest(body, solvingWorks)).status).toBe(400);
    }
  });

  it("refuses an oversized photo before calling the model", async () => {
    const solver = vi.fn(solvingWorks);
    const huge = { ...BODY, base64: "a".repeat(MAX_BASE64_LENGTH + 1) };

    expect((await handleSolveRequest(huge, solver)).status).toBe(413);
    expect(solver).not.toHaveBeenCalled();
  });

  it("passes a solving failure through as a message for the learner", async () => {
    const failing: Solver = async () => {
      throw new SolveError("Try a photo of the question by itself.");
    };
    expect(await handleSolveRequest(BODY, failing)).toEqual({
      status: 502,
      body: { error: "Try a photo of the question by itself." },
    });
  });

  it("does not leak an unexpected error", async () => {
    const exploding: Solver = async () => {
      throw new Error("ANTHROPIC_API_KEY=sk-ant-secret rejected");
    };
    const response = await handleSolveRequest(BODY, exploding);

    expect(response.status).toBe(502);
    expect(JSON.stringify(response.body)).not.toContain("sk-ant");
  });
});
