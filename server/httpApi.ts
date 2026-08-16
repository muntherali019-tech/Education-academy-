import type { IncomingMessage, ServerResponse } from "node:http";
import { handleMarkRequest } from "./markHandler";
import { handleSolveRequest } from "./solveHandler";
import type { HandlerResponse } from "./photoRequest";
import type { Marker } from "../src/marking/marking";
import type { Solver } from "../src/solving/solving";
import { clientKey } from "./clientKey";
import type { PhotoLimits } from "./photoLimits";
import { MARKING_API_PATH, SOLVING_API_PATH } from "./markingApiPlugin";

/** Comfortably above the encoded photo limit; anything larger is refused unread. */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

export interface HttpApiOptions {
  /** Shared by both endpoints — create these once, at startup. */
  limits: PhotoLimits;
  /** Injectable so the API can be exercised without an API key. */
  createMarker?: () => Marker;
  createSolver?: () => Solver;
  /**
   * Only enable behind a proxy you control that overwrites `x-forwarded-for` —
   * otherwise a caller can spoof it and mint a fresh allowance per request.
   */
  trustProxy?: boolean;
  /** Reads the key at call time so tests can vary it. */
  env?: Record<string, string | undefined>;
}

/** True when the path is one this API owns, so the caller can skip static files. */
export function isApiPath(pathname: string): boolean {
  return pathname === MARKING_API_PATH || pathname === SOLVING_API_PATH;
}

function readBody(req: IncomingMessage): Promise<string> {
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

function send(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
  res.end(JSON.stringify(body));
}

/**
 * The production half of the vision endpoints: the same transport-agnostic
 * handlers the Vite dev plugin mounts, wired to a plain `node:http` server so
 * deploying needs no framework and no extra dependency.
 *
 * The marker and solver are built once on first use and reused, and the
 * limiters are supplied by the caller — building either per request would give
 * every request a fresh allowance, which is the same as having no limit.
 */
export function createApi({
  limits,
  createMarker,
  createSolver,
  trustProxy,
  env = process.env,
}: HttpApiOptions) {
  let marker: Marker | null = null;
  let solver: Solver | null = null;

  async function endpoint(
    req: IncomingMessage,
    res: ServerResponse,
    path: string,
    injected: (() => Marker | Solver) | undefined,
    run: (body: unknown, key: string) => Promise<HandlerResponse>,
  ): Promise<void> {
    if (req.method !== "POST") {
      send(res, 405, { error: "Use POST." });
      return;
    }
    if (injected === undefined && !env.ANTHROPIC_API_KEY) {
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

    const response = await run(body, clientKey(req, { trustProxy }));
    send(res, response.status, response.body, response.headers);
  }

  return async function handleApiRequest(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
  ): Promise<void> {
    if (pathname === MARKING_API_PATH) {
      await endpoint(req, res, MARKING_API_PATH, createMarker, async (body, key) => {
        // Imported lazily so the SDK is only loaded when the feature is used.
        marker ??= createMarker?.() ?? (await import("./claudeMarker")).createDefaultMarker();
        return handleMarkRequest(body, marker, { limits: limits.for(key) });
      });
      return;
    }
    await endpoint(req, res, SOLVING_API_PATH, createSolver, async (body, key) => {
      solver ??= createSolver?.() ?? (await import("./claudeSolver")).createDefaultSolver();
      return handleSolveRequest(body, solver, { limits: limits.for(key) });
    });
  };
}
