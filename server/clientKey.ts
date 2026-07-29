import type { Connect } from "vite";

/**
 * Who to count a request against. Behind a proxy the socket address is the
 * proxy's, so `x-forwarded-for` is the only way to tell clients apart — but
 * anyone can send that header, so trusting it lets a caller mint a fresh
 * allowance per request. It is therefore opt-in, for deployments that sit
 * behind a proxy they control and that overwrites the header.
 *
 * With `trustProxy` off and a proxy in front, every client shares one key: the
 * per-client limit then behaves like a second overall limit. That fails towards
 * refusing work rather than towards an unbounded bill.
 */
export interface ClientKeyOptions {
  trustProxy?: boolean;
}

export const UNKNOWN_CLIENT = "unknown";

export function clientKey(
  req: Pick<Connect.IncomingMessage, "headers" | "socket">,
  { trustProxy = false }: ClientKeyOptions = {},
): string {
  if (trustProxy) {
    const forwarded = req.headers["x-forwarded-for"];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return req.socket?.remoteAddress ?? UNKNOWN_CLIENT;
}
