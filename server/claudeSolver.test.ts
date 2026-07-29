import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { SolveError, type SolveRequest } from "../src/solving/solving";
import { buildSolveRequest, createClaudeSolver, SOLVING_MODEL } from "./claudeSolver";
import type { MessageCreator } from "./claudeVision";

const REQUEST: SolveRequest = { stage: "ks3", mediaType: "image/jpeg", base64: "cGhvdG8=" };

const SOLUTION = {
  problem: "3x + 6 = 21",
  steps: [{ explanation: "Take 6 from both sides.", working: "3x = 15" }],
  answer: "x = 5",
  practice: "Try 4x + 8 = 28.",
};

function reply(text: string, stopReason: Anthropic.Message["stop_reason"] = "end_turn") {
  return { content: [{ type: "text", text }], stop_reason: stopReason } as unknown as Anthropic.Message;
}

function client(message: Anthropic.Message): MessageCreator {
  return { messages: { create: vi.fn().mockResolvedValue(message) } };
}

describe("buildSolveRequest", () => {
  it("asks the current model for JSON in the solution schema", () => {
    const request = buildSolveRequest(REQUEST);

    expect(request.model).toBe(SOLVING_MODEL);
    expect(request.output_config?.format).toMatchObject({ type: "json_schema" });
  });

  it("sends the photo as an image block", () => {
    const content = buildSolveRequest(REQUEST).messages[0].content;

    expect(content[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: REQUEST.base64 },
    });
  });

  it("tells the model which UK stage the learner is at", () => {
    expect(buildSolveRequest({ ...REQUEST, stage: "ks1" }).system).toContain("Key Stage 1");
  });

  it("asks for a taught method rather than just the answer", () => {
    const system = String(buildSolveRequest(REQUEST).system);
    expect(system).toMatch(/teach the method/i);
    expect(system).toMatch(/steps/i);
  });

  it("tells the model not to guess at an unreadable problem", () => {
    expect(String(buildSolveRequest(REQUEST).system)).toMatch(/never guess/i);
  });
});

describe("createClaudeSolver", () => {
  it("returns the solution the model produced", async () => {
    expect(await createClaudeSolver(client(reply(JSON.stringify(SOLUTION))))(REQUEST)).toEqual(
      SOLUTION,
    );
  });

  it("passes through an empty solution when nothing could be read", async () => {
    const empty = { problem: "", steps: [], answer: "", practice: "" };
    expect(await createClaudeSolver(client(reply(JSON.stringify(empty))))(REQUEST)).toEqual(empty);
  });

  it("turns a refusal into a message for the learner", async () => {
    const solver = createClaudeSolver(client(reply("", "refusal")));
    await expect(solver(REQUEST)).rejects.toBeInstanceOf(SolveError);
    await expect(solver(REQUEST)).rejects.toThrow(/question by itself/i);
  });

  it("explains working that ran past the token limit", async () => {
    const solver = createClaudeSolver(client(reply("{", "max_tokens")));
    await expect(solver(REQUEST)).rejects.toThrow(/one question/i);
  });

  it("does not leak API failures to the learner", async () => {
    const create = vi.fn().mockRejectedValue(new Error("401 invalid x-api-key sk-ant-secret"));
    const solver = createClaudeSolver({ messages: { create } });

    await expect(solver(REQUEST)).rejects.toThrow(/could not solve that problem/i);
    await expect(solver(REQUEST)).rejects.not.toThrow(/sk-ant/);
  });

  it("rejects output that is not the solution schema", async () => {
    const notJson = createClaudeSolver(client(reply("I cannot read this.")));
    const wrongShape = createClaudeSolver(client(reply('{"problem":"3x + 6 = 21"}')));

    await expect(notJson(REQUEST)).rejects.toThrow(/could not read the working/i);
    await expect(wrongShape(REQUEST)).rejects.toThrow(/could not read the working/i);
  });
});
