import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { startTrial, trialStartedAt, trialActive, trialUsed, hoursLeft } from "./trial.js";

const NOW = new Date("2024-06-01T00:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("trial lifecycle", () => {
  it("has not started before startTrial()", () => {
    expect(trialStartedAt()).toBe(0);
    expect(trialActive()).toBe(false);
    expect(trialUsed()).toBe(false);
    expect(hoursLeft()).toBe(0);
  });

  it("starts the trial and marks it active", () => {
    startTrial();
    expect(trialStartedAt()).toBe(NOW.getTime());
    expect(trialActive()).toBe(true);
    expect(trialUsed()).toBe(true);
    expect(hoursLeft()).toBe(72);
  });

  it("does not reset the start time if called again", () => {
    startTrial();
    const first = trialStartedAt();
    vi.setSystemTime(new Date(NOW.getTime() + 3600000));
    startTrial();
    expect(trialStartedAt()).toBe(first);
  });

  it("counts down hoursLeft", () => {
    startTrial();
    vi.setSystemTime(new Date(NOW.getTime() + 24 * 3600 * 1000));
    expect(hoursLeft()).toBe(48);
  });

  it("expires after 72 hours but remains 'used'", () => {
    startTrial();
    vi.setSystemTime(new Date(NOW.getTime() + 73 * 3600 * 1000));
    expect(trialActive()).toBe(false);
    expect(trialUsed()).toBe(true);
    expect(hoursLeft()).toBe(0);
  });
});
