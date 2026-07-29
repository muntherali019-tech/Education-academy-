import { describe, expect, it, vi } from "vitest";
import { SolveError, type Solution, type SolveRequest } from "./solving";
import { createHttpSolver, DEFAULT_SOLVE_ENDPOINT } from "./solvingClient";

const REQUEST: SolveRequest = { stage: "ks3", mediaType: "image/png", base64: "aG9tZXdvcms=" };

const SOLUTION: Solution = {
  problem: "3x + 6 = 21",
  steps: [{ explanation: "Take 6 from both sides.", working: "3x = 15" }],
  answer: "x = 5",
  practice: "Try 4x + 8 = 28.",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createHttpSolver", () => {
  it("posts the photo and returns the solution", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(SOLUTION));

    expect(await createHttpSolver({ fetchFn })(REQUEST)).toEqual(SOLUTION);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(DEFAULT_SOLVE_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(REQUEST);
  });

  it("posts to a configured endpoint when given one", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(SOLUTION));
    await createHttpSolver({ endpoint: "https://example.com/solve", fetchFn })(REQUEST);
    expect(fetchFn.mock.calls[0][0]).toBe("https://example.com/solve");
  });

  it("explains an unreachable service", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("offline"));
    await expect(createHttpSolver({ fetchFn })(REQUEST)).rejects.toThrow(/connection/i);
  });

  it("explains solving that is switched off", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ error: "no key" }, 501));
    await expect(createHttpSolver({ fetchFn })(REQUEST)).rejects.toThrow(/not switched on/i);
  });

  it("falls back to a general message for other failures", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    await expect(createHttpSolver({ fetchFn })(REQUEST)).rejects.toThrow(/could not solve/i);
  });

  it("rejects a response that is not a solution", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ problem: "3x + 6 = 21" }));
    const promise = createHttpSolver({ fetchFn })(REQUEST);
    await expect(promise).rejects.toBeInstanceOf(SolveError);
    await expect(promise).rejects.toThrow(/could not read the working/i);
  });
});
