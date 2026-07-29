import { describe, expect, it, vi } from "vitest";
import { MarkingError, type Marker, type MarkingResult } from "../src/marking/marking";
import { MAX_PHOTO_BYTES } from "../src/marking/photo";
import { handleMarkRequest } from "./markHandler";

const BODY = { stage: "ks2", mediaType: "image/png", base64: "aG9tZXdvcms=" };

const MARKING: MarkingResult = {
  overall: "Good effort!",
  items: [{ question: "7 x 8?", studentAnswer: "56", verdict: "correct", comment: "Spot on." }],
};

const markingWorks: Marker = async () => MARKING;

describe("handleMarkRequest", () => {
  it("returns the marking for a valid request", async () => {
    const marker = vi.fn(markingWorks);
    expect(await handleMarkRequest(BODY, marker)).toEqual({ status: 200, body: MARKING });
    expect(marker).toHaveBeenCalledWith(BODY);
  });

  it("rejects a body that is missing or malformed", async () => {
    const bad = [
      null,
      "photo",
      {},
      { ...BODY, stage: "ks9" },
      { ...BODY, mediaType: "application/pdf" },
      { ...BODY, base64: "" },
      { ...BODY, base64: 42 },
    ];

    for (const body of bad) {
      expect((await handleMarkRequest(body, markingWorks)).status).toBe(400);
    }
  });

  it("refuses an oversized photo before calling the model", async () => {
    const marker = vi.fn(markingWorks);
    const huge = { ...BODY, base64: "a".repeat(Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 1) };

    expect((await handleMarkRequest(huge, marker)).status).toBe(413);
    expect(marker).not.toHaveBeenCalled();
  });

  it("passes a marking failure through as a message for the learner", async () => {
    const failing: Marker = async () => {
      throw new MarkingError("That page has too much on it.");
    };
    expect(await handleMarkRequest(BODY, failing)).toEqual({
      status: 502,
      body: { error: "That page has too much on it." },
    });
  });

  it("does not leak an unexpected error", async () => {
    const exploding: Marker = async () => {
      throw new Error("ANTHROPIC_API_KEY=sk-ant-secret rejected");
    };
    const response = await handleMarkRequest(BODY, exploding);

    expect(response.status).toBe(502);
    expect(JSON.stringify(response.body)).not.toContain("sk-ant");
  });
});
