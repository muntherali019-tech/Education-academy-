import { describe, expect, it, vi } from "vitest";
import type { Marker } from "../src/marking/marking";
import type { Solver } from "../src/solving/solving";
import { handleMarkRequest } from "./markHandler";
import { handleSolveRequest } from "./solveHandler";
import {
  createPhotoLimits,
  limitsFromEnv,
  PHOTOS_PER_CLIENT_PER_HOUR,
  PHOTOS_PER_HOUR,
} from "./photoLimits";

const BODY = { stage: "ks2", mediaType: "image/png", base64: "aG9tZXdvcms=" };

const marker: Marker = async () => ({ overall: "Good effort!", items: [] });
const solver: Solver = async () => ({ problem: "1 + 1", steps: [], answer: "2", practice: "" });

describe("createPhotoLimits", () => {
  it("lets a client through up to the per-client limit, then answers 429", async () => {
    const limits = createPhotoLimits({ perClient: 2, overall: 100 });

    for (let i = 0; i < 2; i++) {
      const ok = await handleMarkRequest(BODY, marker, { limits: limits.for("1.2.3.4") });
      expect(ok.status).toBe(200);
    }

    const denied = await handleMarkRequest(BODY, marker, { limits: limits.for("1.2.3.4") });
    expect(denied.status).toBe(429);
    expect(denied.headers?.["retry-after"]).toMatch(/^\d+$/);
  });

  it("counts marking and solving against the same allowance", async () => {
    const limits = createPhotoLimits({ perClient: 2, overall: 100 });

    expect((await handleMarkRequest(BODY, marker, { limits: limits.for("a") })).status).toBe(200);
    expect((await handleSolveRequest(BODY, solver, { limits: limits.for("a") })).status).toBe(200);

    expect((await handleSolveRequest(BODY, solver, { limits: limits.for("a") })).status).toBe(429);
  });

  it("keeps one client's spending away from another's", async () => {
    const limits = createPhotoLimits({ perClient: 1, overall: 100 });
    await handleMarkRequest(BODY, marker, { limits: limits.for("a") });

    expect((await handleMarkRequest(BODY, marker, { limits: limits.for("b") })).status).toBe(200);
    expect((await handleMarkRequest(BODY, marker, { limits: limits.for("a") })).status).toBe(429);
  });

  it("caps the deployment overall, however many clients turn up", async () => {
    const limits = createPhotoLimits({ perClient: 10, overall: 3 });

    for (let i = 0; i < 3; i++) {
      const ok = await handleMarkRequest(BODY, marker, { limits: limits.for(`client-${i}`) });
      expect(ok.status).toBe(200);
    }

    const denied = await handleMarkRequest(BODY, marker, { limits: limits.for("client-4") });
    expect(denied.status).toBe(429);
  });

  it("does not let a blocked client eat into the overall allowance", async () => {
    const limits = createPhotoLimits({ perClient: 1, overall: 5 });
    await handleMarkRequest(BODY, marker, { limits: limits.for("greedy") });

    // Five more attempts from the client that is already over its own limit.
    for (let i = 0; i < 5; i++) {
      expect((await handleMarkRequest(BODY, marker, { limits: limits.for("greedy") })).status).toBe(
        429,
      );
    }

    // The overall allowance has only been touched once, so others still get in.
    expect((await handleMarkRequest(BODY, marker, { limits: limits.for("polite") })).status).toBe(
      200,
    );
  });

  it("does no work and spends nothing when a request is refused", async () => {
    const limits = createPhotoLimits({ perClient: 1, overall: 100 });
    const counted = vi.fn(marker);
    await handleMarkRequest(BODY, counted, { limits: limits.for("a") });

    await handleMarkRequest(BODY, counted, { limits: limits.for("a") });

    expect(counted).toHaveBeenCalledTimes(1);
  });

  it("refuses an over-limit caller before parsing the body", async () => {
    const limits = createPhotoLimits({ perClient: 1, overall: 100 });
    await handleMarkRequest(BODY, marker, { limits: limits.for("a") });

    // A malformed body would normally be a 400; the limit is the earlier gate,
    // so probing with junk cannot be cheaper than sending a real photo.
    const denied = await handleMarkRequest({ nonsense: true }, marker, { limits: limits.for("a") });
    expect(denied.status).toBe(429);
  });

  it("frees the allowance up again as the window slides", async () => {
    let clock = 0;
    const limits = createPhotoLimits({ perClient: 1, overall: 100, windowMs: 1000, now: () => clock });
    await handleMarkRequest(BODY, marker, { limits: limits.for("a") });
    expect((await handleMarkRequest(BODY, marker, { limits: limits.for("a") })).status).toBe(429);

    clock += 1001;

    expect((await handleMarkRequest(BODY, marker, { limits: limits.for("a") })).status).toBe(200);
  });

  it("applies no limits when none are passed, so existing callers are unchanged", async () => {
    for (let i = 0; i < 50; i++) {
      expect((await handleMarkRequest(BODY, marker)).status).toBe(200);
    }
  });
});

describe("limitsFromEnv", () => {
  it("falls back to the defaults when nothing is set", () => {
    expect(limitsFromEnv({}).perClient).toBe(PHOTOS_PER_CLIENT_PER_HOUR);
  });

  it("takes positive whole numbers from the environment", () => {
    expect(limitsFromEnv({ PHOTO_RATE_LIMIT_PER_CLIENT: "5", PHOTO_RATE_LIMIT_TOTAL: "50" })).toEqual(
      { perClient: 5, overall: 50 },
    );
  });

  it("ignores values that are not a usable limit", () => {
    const nonsense = limitsFromEnv({ PHOTO_RATE_LIMIT_PER_CLIENT: "lots", PHOTO_RATE_LIMIT_TOTAL: "-3" });
    expect(nonsense.perClient).toBe(PHOTOS_PER_CLIENT_PER_HOUR);
    expect(nonsense.overall).toBe(PHOTOS_PER_HOUR);
  });
});
