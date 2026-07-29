import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  markingApi,
  MARKING_API_PATH,
  SOLVING_API_PATH,
  type MarkingApiOptions,
} from "./markingApiPlugin";
import type { MarkingResult } from "../src/marking/marking";
import { MarkingError } from "../src/marking/marking";
import type { Solution } from "../src/solving/solving";
import { SolveError } from "../src/solving/solving";

// The dev-server plugin was the one file in the repo with no coverage at all.
// It is a Vite plugin, so rather than boot Vite we call configureServer with a
// stand-in that captures the registered middleware, then drive those handlers
// with fake req/res objects. createMarker/createSolver are injectable, so no
// API key is ever needed and the Anthropic SDK is never imported.

type Handler = (req: FakeRequest, res: FakeResponse) => Promise<void>;

class FakeRequest extends EventEmitter {
  constructor(public method: string) {
    super();
  }
  destroyed = false;
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

/** Register the plugin against a stand-in server and return its two handlers. */
function mount(options: MarkingApiOptions = {}): Record<string, Handler> {
  const routes: Record<string, Handler> = {};
  const plugin = markingApi(options);
  const server = {
    middlewares: {
      use(path: string, handler: Handler) {
        routes[path] = handler;
      },
    },
  };
  // configureServer is typed against Vite's ViteDevServer; the plugin only ever
  // touches server.middlewares.use, so a structural stand-in is enough.
  (plugin.configureServer as unknown as (s: typeof server) => void)(server);
  return routes;
}

/** Drive a handler with a JSON body delivered as one or more chunks. */
async function call(
  handler: Handler,
  { method = "POST", chunks }: { method?: string; chunks?: string[] } = {},
): Promise<FakeResponse> {
  const req = new FakeRequest(method);
  const res = new FakeResponse();
  const done = handler(req, res);
  // Let the handler attach its listeners before anything is emitted.
  await Promise.resolve();
  for (const chunk of chunks ?? []) req.emit("data", Buffer.from(chunk));
  req.emit("end");
  await done;
  return res;
}

const post = (handler: Handler, body: unknown) =>
  call(handler, { chunks: [JSON.stringify(body)] });

const validPhoto = {
  stage: "ks2",
  mediaType: "image/png",
  base64: "aGVsbG8=",
};

const markingResult: MarkingResult = {
  overall: "Great effort!",
  items: [{ verdict: "correct", question: "2+2", comment: "Spot on." } as MarkingResult["items"][0]],
};

const solution: Solution = {
  problem: "2 + 2",
  steps: [{ explanation: "Add them.", working: "2 + 2 = 4" }],
  answer: "4",
  practice: "3 + 3",
};

let routes: Record<string, Handler>;
const marker = vi.fn(async () => markingResult);
const solver = vi.fn(async () => solution);

beforeEach(() => {
  marker.mockClear();
  solver.mockClear();
  routes = mount({ createMarker: () => marker, createSolver: () => solver });
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

describe("registration", () => {
  it("registers both endpoints on the dev server", () => {
    expect(Object.keys(routes).sort()).toEqual([MARKING_API_PATH, SOLVING_API_PATH].sort());
  });

  it("only applies to the dev server, not the production build", () => {
    expect(markingApi().apply).toBe("serve");
    expect(markingApi().name).toBe("education-academy:marking-api");
  });
});

describe("marking endpoint", () => {
  it("marks a valid request", async () => {
    const res = await post(routes[MARKING_API_PATH]!, validPhoto);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/json");
    expect(res.json).toEqual(markingResult);
    expect(marker).toHaveBeenCalledWith(validPhoto);
  });

  it("reuses one marker across requests rather than building one per call", async () => {
    const createMarker = vi.fn(() => marker);
    const only = mount({ createMarker });
    await post(only[MARKING_API_PATH]!, validPhoto);
    await post(only[MARKING_API_PATH]!, validPhoto);
    expect(createMarker).toHaveBeenCalledTimes(1);
    expect(marker).toHaveBeenCalledTimes(2);
  });

  it("rejects a non-POST method", async () => {
    const res = await call(routes[MARKING_API_PATH]!, { method: "GET" });
    expect(res.statusCode).toBe(405);
    expect(res.json.error).toMatch(/POST/);
    expect(marker).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const res = await call(routes[MARKING_API_PATH]!, { chunks: ["not json"] });
    expect(res.statusCode).toBe(400);
    expect(res.json.error).toMatch(/JSON/);
    expect(marker).not.toHaveBeenCalled();
  });

  it("rejects a JSON body that is not a photo request", async () => {
    const res = await post(routes[MARKING_API_PATH]!, { stage: "not-a-stage" });
    expect(res.statusCode).toBe(400);
    expect(marker).not.toHaveBeenCalled();
  });

  it("turns a marking failure into a learner-safe 502", async () => {
    const failing = mount({
      createMarker: () => async () => {
        throw new MarkingError("Mochi could not read that photo.");
      },
    });
    const res = await post(failing[MARKING_API_PATH]!, validPhoto);
    expect(res.statusCode).toBe(502);
    expect(res.json.error).toBe("Mochi could not read that photo.");
  });

  it("does not leak an unexpected error's message to the learner", async () => {
    const failing = mount({
      createMarker: () => async () => {
        throw new Error("ECONNREFUSED 10.0.0.1:443");
      },
    });
    const res = await post(failing[MARKING_API_PATH]!, validPhoto);
    expect(res.statusCode).toBe(502);
    expect(res.raw).not.toContain("ECONNREFUSED");
    expect(res.json.error).toMatch(/could not mark/i);
  });

  it("accepts a body split across several chunks", async () => {
    const body = JSON.stringify(validPhoto);
    const res = await call(routes[MARKING_API_PATH]!, {
      chunks: [body.slice(0, 10), body.slice(10, 25), body.slice(25)],
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("solving endpoint", () => {
  it("solves a valid request", async () => {
    const res = await post(routes[SOLVING_API_PATH]!, validPhoto);
    expect(res.statusCode).toBe(200);
    expect(res.json).toEqual(solution);
    expect(solver).toHaveBeenCalledWith(validPhoto);
  });

  it("rejects a non-POST method", async () => {
    const res = await call(routes[SOLVING_API_PATH]!, { method: "GET" });
    expect(res.statusCode).toBe(405);
  });

  it("turns a solve failure into a learner-safe 502", async () => {
    const failing = mount({
      createSolver: () => async () => {
        throw new SolveError("Mochi could not read that problem.");
      },
    });
    const res = await post(failing[SOLVING_API_PATH]!, validPhoto);
    expect(res.statusCode).toBe(502);
    expect(res.json.error).toBe("Mochi could not read that problem.");
  });
});

describe("without an injected implementation", () => {
  it("answers 501 when no API key is configured", async () => {
    const bare = mount();
    for (const path of [MARKING_API_PATH, SOLVING_API_PATH]) {
      const res = await post(bare[path]!, validPhoto);
      expect(res.statusCode).toBe(501);
      expect(res.json.error).toMatch(/ANTHROPIC_API_KEY/);
    }
  });

  it("does not check for a key when an implementation is injected", async () => {
    // The injected path must work with no key at all — this is what keeps the
    // suite from needing one.
    expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
    const res = await post(routes[MARKING_API_PATH]!, validPhoto);
    expect(res.statusCode).toBe(200);
  });
});

describe("oversized bodies", () => {
  it("refuses a body past the byte ceiling and destroys the connection", async () => {
    const req = new FakeRequest("POST");
    const res = new FakeResponse();
    const done = routes[MARKING_API_PATH]!(req, res);
    await Promise.resolve();

    // One chunk over the 8 MB ceiling; the handler must not buffer it all.
    req.emit("data", Buffer.alloc(9 * 1024 * 1024, "x"));
    await done;

    expect(res.statusCode).toBe(413);
    expect(res.json.error).toMatch(/too big/i);
    expect(req.destroyed).toBe(true);
    expect(marker).not.toHaveBeenCalled();
  });

  it("refuses a photo past the encoded photo limit with 413", async () => {
    // Under the transport ceiling, over the photo limit — rejected by the
    // handler rather than the body reader.
    const res = await post(routes[MARKING_API_PATH]!, {
      ...validPhoto,
      base64: "a".repeat(7 * 1024 * 1024),
    });
    expect(res.statusCode).toBe(413);
    expect(marker).not.toHaveBeenCalled();
  });
});
