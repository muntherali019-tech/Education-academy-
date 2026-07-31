import { describe, expect, it, vi } from "vitest";
import { MarkingError, type MarkingRequest, type MarkingResult } from "./marking";
import { createHttpMarker, DEFAULT_MARKING_ENDPOINT } from "./markingClient";

const REQUEST: MarkingRequest = { stage: "ks2", mediaType: "image/png", base64: "aG9tZXdvcms=" };

const MARKING: MarkingResult = {
  overall: "Nearly there!",
  items: [
    { question: "7 x 8?", studentAnswer: "54", verdict: "incorrect", comment: "So close — try again." },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createHttpMarker", () => {
  it("posts the photo and returns the marking", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(MARKING));
    const mark = createHttpMarker({ endpoint: "/api/mark", fetchFn });

    expect(await mark(REQUEST)).toEqual(MARKING);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("/api/mark");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(REQUEST);
  });

  it("defaults to the built-in endpoint", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(MARKING));
    await createHttpMarker({ fetchFn })(REQUEST);
    expect(fetchFn.mock.calls[0][0]).toBe(DEFAULT_MARKING_ENDPOINT);
  });

  it("explains an unreachable service", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("offline"));
    await expect(createHttpMarker({ fetchFn })(REQUEST)).rejects.toThrow(/connection/i);
  });

  it("explains marking that is switched off", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ error: "no key" }, 501));
    await expect(createHttpMarker({ fetchFn })(REQUEST)).rejects.toThrow(/not switched on/i);
  });

  it("explains an oversized photo and a busy service", async () => {
    const tooBig = createHttpMarker({ fetchFn: vi.fn().mockResolvedValue(jsonResponse({}, 413)) });
    const busy = createHttpMarker({ fetchFn: vi.fn().mockResolvedValue(jsonResponse({}, 429)) });

    await expect(tooBig(REQUEST)).rejects.toThrow(/too big/i);
    await expect(busy(REQUEST)).rejects.toThrow(/lot of photos in the last hour/i);
  });

  it("falls back to a general message for other failures", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    await expect(createHttpMarker({ fetchFn })(REQUEST)).rejects.toThrow(/could not mark/i);
  });

  it("rejects a response that is not marking", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ overall: "Hi" }));
    const promise = createHttpMarker({ fetchFn })(REQUEST);
    await expect(promise).rejects.toBeInstanceOf(MarkingError);
    await expect(promise).rejects.toThrow(/could not read the marking/i);
  });

  it("rejects a response that is not JSON at all", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("<html>oops</html>", { status: 200 }));
    await expect(createHttpMarker({ fetchFn })(REQUEST)).rejects.toThrow(/could not read the marking/i);
  });
});
