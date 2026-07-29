import type { Connect, Plugin } from "vite";
import { handleMarkRequest } from "./markHandler";
import { handleSolveRequest } from "./solveHandler";
import type { HandlerResponse } from "./photoRequest";
import type { Marker } from "../src/marking/marking";
import type { Solver } from "../src/solving/solving";

export const MARKING_API_PATH = "/api/mark";
export const SOLVING_API_PATH = "/api/solve";

/** Comfortably above the encoded photo limit; anything larger is refused unread. */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

type Response = Parameters<Connect.NextHandleFunction>[1];

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error("too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function send(res: Response, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

export interface MarkingApiOptions {
  /** Injectable so the plugin can be exercised without a real API key. */
  createMarker?: () => Marker;
  createSolver?: () => Solver;
}

/**
 * Serves the vision endpoints from the Vite dev server, so `npm run dev` marks
 * homework and solves problems for real when `ANTHROPIC_API_KEY` is set.
 * Without a key they answer 501 and the UI says the feature is not switched on
 * — the app still runs, and the tests never need a key.
 *
 * In production these endpoints are whatever you deploy; `handleMarkRequest`
 * and `handleSolveRequest` are the transport-agnostic halves you mount there.
 */
export function markingApi({ createMarker, createSolver }: MarkingApiOptions = {}): Plugin {
  let marker: Marker | null = null;
  let solver: Solver | null = null;

  function endpoint(
    path: string,
    injected: (() => Marker | Solver) | undefined,
    run: (body: unknown) => Promise<HandlerResponse>,
  ) {
    return async (req: Connect.IncomingMessage, res: Response) => {
      if (req.method !== "POST") {
        send(res, 405, { error: "Use POST." });
        return;
      }
      if (injected === undefined && !process.env.ANTHROPIC_API_KEY) {
        send(res, 501, { error: `Set ANTHROPIC_API_KEY to enable ${path}.` });
        return;
      }

      let raw: string;
      try {
        raw = await readBody(req);
      } catch {
        send(res, 413, { error: "That photo is too big to use." });
        return;
      }

      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        send(res, 400, { error: "Expected a JSON body." });
        return;
      }

      const response = await run(body);
      send(res, response.status, response.body);
    };
  }

  return {
    name: "education-academy:marking-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(
        MARKING_API_PATH,
        endpoint(MARKING_API_PATH, createMarker, async (body) => {
          // Imported lazily so the SDK is only loaded when the feature is used.
          marker ??= createMarker?.() ?? (await import("./claudeMarker")).createDefaultMarker();
          return handleMarkRequest(body, marker);
        }),
      );

      server.middlewares.use(
        SOLVING_API_PATH,
        endpoint(SOLVING_API_PATH, createSolver, async (body) => {
          solver ??= createSolver?.() ?? (await import("./claudeSolver")).createDefaultSolver();
          return handleSolveRequest(body, solver);
        }),
      );
    },
  };
}
