import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { MarkingError, type MarkingRequest } from "../src/marking/marking";
import {
  buildMarkingRequest,
  createClaudeMarker,
  MARKING_MODEL,
  type MessageCreator,
} from "./claudeMarker";

const REQUEST: MarkingRequest = { stage: "ks2", mediaType: "image/png", base64: "aG9tZXdvcms=" };

const MARKING = {
  overall: "Good effort!",
  items: [
    { question: "7 x 8?", studentAnswer: "54", verdict: "incorrect", comment: "Try counting up." },
  ],
};

function reply(text: string, stopReason: Anthropic.Message["stop_reason"] = "end_turn") {
  return {
    content: [{ type: "text", text, citations: null }],
    stop_reason: stopReason,
  } as unknown as Anthropic.Message;
}

function client(message: Anthropic.Message): MessageCreator & { create: ReturnType<typeof vi.fn> } {
  const create = vi.fn().mockResolvedValue(message);
  return { create, messages: { create } };
}

describe("buildMarkingRequest", () => {
  it("asks the current model for JSON in the marking schema", () => {
    const request = buildMarkingRequest(REQUEST);

    expect(request.model).toBe(MARKING_MODEL);
    expect(request.output_config?.format).toMatchObject({ type: "json_schema" });
    expect(request.max_tokens).toBeGreaterThan(1000);
  });

  it("sends the photo as an image block alongside the instruction", () => {
    const content = buildMarkingRequest(REQUEST).messages[0].content;

    expect(Array.isArray(content)).toBe(true);
    expect(content[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: REQUEST.base64 },
    });
    expect(content[1]).toMatchObject({ type: "text" });
  });

  it("tells the model which UK stage it is marking", () => {
    expect(buildMarkingRequest({ ...REQUEST, stage: "ks3" }).system).toContain("Key Stage 3");
    expect(buildMarkingRequest({ ...REQUEST, stage: "he" }).system).toContain("Higher Education");
  });

  it("tells the model not to guess when the photo cannot be read", () => {
    expect(String(buildMarkingRequest(REQUEST).system)).toMatch(/unclear/i);
  });
});

describe("createClaudeMarker", () => {
  it("returns the marking the model produced", async () => {
    const marker = createClaudeMarker(client(reply(JSON.stringify(MARKING))));
    expect(await marker(REQUEST)).toEqual(MARKING);
  });

  it("joins text blocks before parsing", async () => {
    const split = {
      content: [
        { type: "text", text: '{"overall":"Good effort!","items":' },
        { type: "text", text: "[]}" },
      ],
      stop_reason: "end_turn",
    } as unknown as Anthropic.Message;

    expect(await createClaudeMarker(client(split))(REQUEST)).toEqual({
      overall: "Good effort!",
      items: [],
    });
  });

  it("turns a refusal into a message for the learner", async () => {
    const marker = createClaudeMarker(client(reply("", "refusal")));
    await expect(marker(REQUEST)).rejects.toBeInstanceOf(MarkingError);
    await expect(marker(REQUEST)).rejects.toThrow(/homework page/i);
  });

  it("explains a page that ran past the token limit", async () => {
    const marker = createClaudeMarker(client(reply("{", "max_tokens")));
    await expect(marker(REQUEST)).rejects.toThrow(/one page at a time/i);
  });

  it("does not leak API failures to the learner", async () => {
    const create = vi.fn().mockRejectedValue(new Error("401 invalid x-api-key sk-ant-secret"));
    const marker = createClaudeMarker({ messages: { create } });

    await expect(marker(REQUEST)).rejects.toThrow(/could not mark that photo/i);
    await expect(marker(REQUEST)).rejects.not.toThrow(/sk-ant/);
  });

  it("rejects output that is not the marking schema", async () => {
    const notJson = createClaudeMarker(client(reply("Sorry, I cannot read this.")));
    const wrongShape = createClaudeMarker(client(reply('{"overall":"Hi"}')));

    await expect(notJson(REQUEST)).rejects.toThrow(/could not read the marking/i);
    await expect(wrongShape(REQUEST)).rejects.toThrow(/could not read the marking/i);
  });
});
