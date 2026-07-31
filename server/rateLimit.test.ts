import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rateLimit";

const MINUTE = 60 * 1000;

/** A limiter with a clock the test drives by hand. */
function limiterAt(limit: number, windowMs: number, maxKeys?: number) {
  let clock = 1_000_000;
  const limiter = createRateLimiter({
    limit,
    windowMs,
    maxKeys,
    now: () => clock,
  });
  return {
    limiter,
    advance(ms: number) {
      clock += ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("allows requests up to the limit", () => {
    const { limiter } = limiterAt(3, MINUTE);

    expect(limiter.check("a")).toEqual({ allowed: true, remaining: 2, retryAfterSeconds: 0 });
    expect(limiter.check("a")).toEqual({ allowed: true, remaining: 1, retryAfterSeconds: 0 });
    expect(limiter.check("a")).toEqual({ allowed: true, remaining: 0, retryAfterSeconds: 0 });
  });

  it("denies the request after the limit, with a wait", () => {
    const { limiter } = limiterAt(2, MINUTE);
    limiter.check("a");
    limiter.check("a");

    const denied = limiter.check("a");

    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterSeconds).toBe(60);
  });

  it("keeps each key on its own allowance", () => {
    const { limiter } = limiterAt(1, MINUTE);
    expect(limiter.check("a").allowed).toBe(true);

    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("gives capacity back as the oldest request ages out", () => {
    const { limiter, advance } = limiterAt(2, MINUTE);
    limiter.check("a"); // at 0s
    advance(30 * 1000);
    limiter.check("a"); // at 30s
    expect(limiter.check("a").allowed).toBe(false);

    advance(31 * 1000); // the 0s request has now left the window

    expect(limiter.check("a").allowed).toBe(true);
    // The 30s request is still inside it, so the allowance is not fully back.
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("counts down the wait as the window slides", () => {
    const { limiter, advance } = limiterAt(1, MINUTE);
    limiter.check("a");

    expect(limiter.check("a").retryAfterSeconds).toBe(60);
    advance(45 * 1000);
    expect(limiter.check("a").retryAfterSeconds).toBe(15);
  });

  it("never reports a wait below a second", () => {
    const { limiter, advance } = limiterAt(1, MINUTE);
    limiter.check("a");
    advance(MINUTE - 1);

    expect(limiter.check("a").retryAfterSeconds).toBe(1);
  });

  it("forgets keys that have gone quiet, rather than growing without bound", () => {
    const { limiter, advance } = limiterAt(5, MINUTE, 2);
    limiter.check("a");
    limiter.check("b");
    advance(2 * MINUTE);

    limiter.check("c");
    limiter.check("d");

    expect(limiter.size()).toBeLessThanOrEqual(2);
  });

  it("evicts quiet keys ahead of a blocked one, which would get a free allowance", () => {
    const { limiter } = limiterAt(2, MINUTE, 3);
    limiter.check("blocked");
    limiter.check("blocked");
    expect(limiter.check("blocked").allowed).toBe(false);

    // A flood of one-off keys arrives, pushing the map well past its ceiling.
    for (let i = 0; i < 50; i++) {
      limiter.check(`spoofed-${i}`);
    }

    expect(limiter.check("blocked").allowed).toBe(false);
    expect(limiter.size()).toBeLessThanOrEqual(3);
  });

  it("still bounds memory when every tracked key is blocked", () => {
    // The one case the eviction preference cannot serve: with nothing quiet to
    // drop, the oldest blocked key goes and gets its allowance back. Memory is
    // the harder constraint, and the global limiter is the backstop for spend.
    const { limiter } = limiterAt(1, MINUTE, 3);
    for (let i = 0; i < 50; i++) {
      limiter.check(`blocked-${i}`);
    }

    expect(limiter.size()).toBeLessThanOrEqual(3);
  });

  it("uses the wall clock by default", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: MINUTE });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });
});
