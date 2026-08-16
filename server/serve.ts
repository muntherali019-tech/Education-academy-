// Production entry point: serves the built app and the two vision endpoints
// from one plain node:http server, so a deploy needs no framework and no extra
// dependency. In development the same handlers are mounted on the Vite dev
// server instead (see markingApiPlugin.ts) — this file is never used there.
//
// Build and run:
//   npm run build && npm run build:server && npm start
//
// Excluded from coverage: it is the process bootstrap. The request handling it
// delegates to lives in httpApi.ts, which is covered.

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createApi, isApiPath } from "./httpApi";
import { createPhotoLimits, limitsFromEnv } from "./photoLimits";

const PORT = Number(process.env.PORT) || 3000;
const ROOT = resolve(process.env.STATIC_DIR ?? "dist");
const INDEX = join(ROOT, "index.html");

// Set only behind a proxy you control that overwrites x-forwarded-for. With it
// off behind a proxy every client shares one key, which fails towards refusing
// work rather than towards an unbounded bill.
const trustProxy = process.env.TRUST_PROXY === "1";

// Created once, at startup. Building the limiters per request would hand every
// request a fresh allowance — the same as having no limit at all.
const limits = createPhotoLimits(limitsFromEnv(process.env));
const handleApiRequest = createApi({ limits, trustProxy });

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/**
 * Resolve a URL path to a file inside ROOT, or null if it escapes ROOT or does
 * not exist. Normalising before joining is what stops `../` traversal.
 */
function resolveStatic(pathname: string): string | null {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const candidate = join(ROOT, relative);
  if (!candidate.startsWith(ROOT)) return null;
  if (!existsSync(candidate) || !statSync(candidate).isFile()) return null;
  return candidate;
}

function sendFile(res: import("node:http").ServerResponse, file: string, status = 200): void {
  const type = CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
  res.statusCode = status;
  res.setHeader("content-type", type);
  // Vite fingerprints everything under /assets, so those are safe to cache hard.
  res.setHeader(
    "cache-control",
    file.includes(`${join(ROOT, "assets")}`) ? "public, max-age=31536000, immutable" : "no-cache",
  );
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).pathname;

  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("referrer-policy", "no-referrer");

  if (isApiPath(pathname)) {
    try {
      await handleApiRequest(req, res, pathname);
    } catch {
      // Never leak an internal error to a learner.
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: "Something went wrong. Please try again." }));
      }
    }
    return;
  }

  // Anything else under /api is a real 404, not the SPA shell — an API client
  // should never receive HTML.
  if (pathname.startsWith("/api/")) {
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "Not found." }));
    return;
  }

  const file = resolveStatic(pathname);
  if (file) {
    sendFile(res, file);
    return;
  }

  // SPA fallback: the app routes on the client.
  if (existsSync(INDEX)) {
    sendFile(res, INDEX);
    return;
  }

  res.statusCode = 404;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end("Not found. Run `npm run build` first.");
});

server.listen(PORT, () => {
  const vision = process.env.ANTHROPIC_API_KEY ? "live" : "off (set ANTHROPIC_API_KEY)";
  console.log(`Education Academy on http://localhost:${PORT}  (serving ${ROOT}, vision: ${vision})`);
});
