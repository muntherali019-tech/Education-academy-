import type { Connect, Plugin } from "vite";
import { handleMarkRequest } from "./markHandler";
import type { Marker } from "../src/marking/marking";

export const MARKING_API_PATH = "/api/mark";

/** 1MB of JSON is roughly a 700KB photo; anything larger is refused unread. */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

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

function send(res: Parameters<Connect.NextHandleFunction>[1], status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

export interface MarkingApiOptions {
  /** Injectable so the plugin can be exercised without a real API key. */
  createMarker?: () => Marker;
}

/**
 * Serves the marking endpoint from the Vite dev server, so `npm run dev` marks
 * homework for real when `ANTHROPIC_API_KEY` is set. Without a key it answers
 * 501 and the UI says photo marking is not switched on — the app still runs.
 *
 * In production this endpoint is whatever you deploy; `handleMarkRequest` is
 * the transport-agnostic half you mount there.
 */
export function markingApi({ createMarker }: MarkingApiOptions = {}): Plugin {
  let marker: Marker | null = null;

  return {
    name: "education-academy:marking-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(MARKING_API_PATH, async (req, res) => {
        if (req.method !== "POST") {
          send(res, 405, { error: "Use POST." });
          return;
        }
        if (createMarker === undefined && !process.env.ANTHROPIC_API_KEY) {
          send(res, 501, { error: "Set ANTHROPIC_API_KEY to enable photo marking." });
          return;
        }

        let raw: string;
        try {
          raw = await readBody(req);
        } catch {
          send(res, 413, { error: "That photo is too big to mark." });
          return;
        }

        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          send(res, 400, { error: "Expected a JSON body." });
          return;
        }

        if (marker === null) {
          // Imported lazily so the SDK is only loaded when marking is used.
          marker =
            createMarker?.() ?? (await import("./claudeMarker")).createDefaultMarker();
        }
        const response = await handleMarkRequest(body, marker);
        send(res, response.status, response.body);
      });
    },
  };
}
