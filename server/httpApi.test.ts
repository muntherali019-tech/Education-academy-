import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { createApi, isApiPath, type HttpApiOptions } from "./httpApi";
import { createPhotoLimits } from "./photoLimits";
import type { MarkingResult } from "../src/marking/marking";
import { MarkingError } from "../src/marking/marking";
import type { Solution } from "../src/solving/solving";
import { SolveError } from "../src/solving/solving";

// The production API is driven with fake req/res objects rather than a real
// socket: createMarker/createSolver are injectable, so no API key is needed and
// the Anthropic SDK is never imported.

class FakeRequest extends EventEmitter {
  headers: Record<string, string> = {};
  socket = { remoteAddress: "10.0.0.1" };
  destroyed = false;
  constructor(public method: string) {
    super();
  }
  destroy(): void {
    this.destroyed = true;
  }
}

class FakeResponse {
  statusCode = 200;
  headers: Record<string, string> = {};
  raw = "";
  setHeader(name: string, value: string): void {
    this.headers[name] = value;
  }
  end(body: string): void {
    this.raw = body;
  }
  get json(): Record<string, unknown> {
    return JSON.parse(this.raw);
  }
}

const PHOTO = { stage: "ks2", mediaType: "image/png", base64: "aGVsbG8=" };

const marking: MarkingResult = {
  overall: "Great effort!",
  items: [{ question: "7 x 8?", studentAnswer: "56", verdict: "correct", comment: "Spot on." }],
};
const solution: Solution = {
  problem: "3x + 6 = 21",
  steps: [{ explanation: "Take 6 from both sides.", working: "3x = 15" }],
  answer: "x = 5",
  practice: "Try 4x + 8 = 28.",
};

/** Drives one request through the API and resolves with the response. */
async function call(
  api: ReturnType<typeof createApi>,
  path: string,
  {
    method = "POST",
    body = JSON.stringify(PHOTO),
    client = "10.0.0.1",
  }: { method?: string; body?: string | null; client?: string } = {},
): Promise<FakeResponse> {
  const req = new FakeRequest(method);
  req.socket = { remoteAddress: client };
  const res = new FakeResponse();
  const done = api(req as never, res as never, path);
  if (body !== null) req.emit("data", Buffer.from(body));
  req.emit("end");
  await done;
  return res;
}

function makeApi(overrides: Partial<HttpApiOptions> = {}) {
  return createApi({
    limits: createPhotoLimits(),
    createMarker: () => vi.fn(async () => marking),
    createSolver: () => vi.fn(async () => solution),
    ...overrides,
  });
}

describe("isApiPath", () => {
  it("claims only the two vision endpoints", () => {
    expect(isApiPath("/api/mark")).toBe(true);
    expect(isApiPath("/api/solve")).toBe(true);
    expect(isApiPath("/api/anything-else")).toBe(false);
    expect(isApiPath("/")).toBe(false);
  });
});

describe("createApi", () => {
  it("marks a photo and returns the result", async () => {
    const res = await call(makeApi(), "/api/mark");
    expect(res.statusCode).toBe(200);
    expect(res.json).toEqual(marking);
    expect(res.headers["content-type"]).toBe("application/json");
  });

  it("solves a photo and returns the worked steps", async () => {
    const res = await call(makeApi(), "/api/solve");
    expect(res.statusCode).toBe(200);
    expect(res.json).toEqual(solution);
  });

  it("refuses anything but POST", async () => {
    const res = await call(makeApi(), "/api/mark", { method: "GET", body: null });
    expect(res.statusCode).toBe(405);
  });

  it("rejects a body that is not JSON", async () => {
    const res = await call(makeApi(), "/api/mark", { body: "not json" });
    expect(res.statusCode).toBe(400);
  });

  it("answers 501 when no key is configured and nothing is injected", async () => {
    const api = createApi({ limits: createPhotoLimits(), env: {} });
    const res = await call(api, "/api/mark");
    expect(res.statusCode).toBe(501);
    // The message must stay safe to show a learner — no key or transport detail.
    expect(String(res.json.error)).toContain("ANTHROPIC_API_KEY");
  });

  it("builds the marker once and reuses it across requests", async () => {
    const marker = vi.fn(async () => marking);
    const createMarker = vi.fn(() => marker);
    const api = makeApi({ createMarker });

    await call(api, "/api/mark");
    await call(api, "/api/mark");

    expect(createMarker).toHaveBeenCalledTimes(1);
    expect(marker).toHaveBeenCalledTimes(2);
  });

  it("turns a marking failure into a learner-safe error", async () => {
    const api = makeApi({
      createMarker: () => async () => {
        throw new MarkingError("Mochi could not read that photo.");
      },
    });
    const res = await call(api, "/api/mark");
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.json.error).toBe("Mochi could not read that photo.");
  });

  it("turns a solving failure into a learner-safe error", async () => {
    const api = makeApi({
      createSolver: () => async () => {
        throw new SolveError("Mochi could not read that photo.");
      },
    });
    const res = await call(api, "/api/solve");
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.json.error).toBe("Mochi could not read that photo.");
  });

  it("rate limits a client that goes over its per-client allowance", async () => {
    // Marking and solving share one budget, so two photos exhausts it.
    const api = makeApi({ limits: createPhotoLimits({ perClient: 2, overall: 100 }) });

    expect((await call(api, "/api/mark")).statusCode).toBe(200);
    expect((await call(api, "/api/solve")).statusCode).toBe(200);

    const limited = await call(api, "/api/mark");
    expect(limited.statusCode).toBe(429);
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("counts each client separately", async () => {
    const api = makeApi({ limits: createPhotoLimits({ perClient: 1, overall: 100 }) });

    expect((await call(api, "/api/mark", { client: "10.0.0.1" })).statusCode).toBe(200);
    expect((await call(api, "/api/mark", { client: "10.0.0.1" })).statusCode).toBe(429);
    expect((await call(api, "/api/mark", { client: "10.0.0.2" })).statusCode).toBe(200);
  });

  it("caps overall spend even across different clients", async () => {
    const api = makeApi({ limits: createPhotoLimits({ perClient: 100, overall: 2 }) });

    expect((await call(api, "/api/mark", { client: "10.0.0.1" })).statusCode).toBe(200);
    expect((await call(api, "/api/mark", { client: "10.0.0.2" })).statusCode).toBe(200);
    // The overall limit is the one that actually caps the bill.
    expect((await call(api, "/api/mark", { client: "10.0.0.3" })).statusCode).toBe(429);
  });

  it("ignores x-forwarded-for unless trustProxy is on", async () => {
    const api = makeApi({ limits: createPhotoLimits({ perClient: 1, overall: 100 }) });

    const first = new FakeRequest("POST");
    first.headers["x-forwarded-for"] = "203.0.113.1";
    const firstRes = new FakeResponse();
    const firstDone = api(first as never, firstRes as never, "/api/mark");
    first.emit("data", Buffer.from(JSON.stringify(PHOTO)));
    first.emit("end");
    await firstDone;
    expect(firstRes.statusCode).toBe(200);

    // A spoofed header must not mint a fresh allowance: same socket, still limited.
    const second = new FakeRequest("POST");
    second.headers["x-forwarded-for"] = "203.0.113.2";
    const secondRes = new FakeResponse();
    const secondDone = api(second as never, secondRes as never, "/api/mark");
    second.emit("data", Buffer.from(JSON.stringify(PHOTO)));
    second.emit("end");
    await secondDone;
    expect(secondRes.statusCode).toBe(429);
  });
});
