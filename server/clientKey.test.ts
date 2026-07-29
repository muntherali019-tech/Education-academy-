import { describe, expect, it } from "vitest";
import type { Connect } from "vite";
import { clientKey, UNKNOWN_CLIENT } from "./clientKey";

type Req = Pick<Connect.IncomingMessage, "headers" | "socket">;

function request(headers: Record<string, string | string[]>, remoteAddress?: string): Req {
  return { headers, socket: { remoteAddress } } as unknown as Req;
}

describe("clientKey", () => {
  it("uses the socket address by default", () => {
    expect(clientKey(request({}, "1.2.3.4"))).toBe("1.2.3.4");
  });

  it("ignores x-forwarded-for unless the proxy is trusted", () => {
    const req = request({ "x-forwarded-for": "9.9.9.9" }, "1.2.3.4");

    // Trusting it by default would let any caller mint a fresh allowance per
    // request simply by varying the header.
    expect(clientKey(req)).toBe("1.2.3.4");
    expect(clientKey(req, { trustProxy: true })).toBe("9.9.9.9");
  });

  it("takes the original client from a forwarding chain", () => {
    const req = request({ "x-forwarded-for": "9.9.9.9, 10.0.0.1, 10.0.0.2" }, "10.0.0.2");
    expect(clientKey(req, { trustProxy: true })).toBe("9.9.9.9");
  });

  it("handles a repeated header", () => {
    const req = request({ "x-forwarded-for": ["9.9.9.9", "8.8.8.8"] }, "10.0.0.2");
    expect(clientKey(req, { trustProxy: true })).toBe("9.9.9.9");
  });

  it("falls back to the socket address when the header is empty", () => {
    expect(clientKey(request({ "x-forwarded-for": "" }, "1.2.3.4"), { trustProxy: true })).toBe(
      "1.2.3.4",
    );
    expect(clientKey(request({ "x-forwarded-for": " , " }, "1.2.3.4"), { trustProxy: true })).toBe(
      "1.2.3.4",
    );
  });

  it("falls back to a single shared key when there is no address at all", () => {
    expect(clientKey(request({}))).toBe(UNKNOWN_CLIENT);
  });
});
