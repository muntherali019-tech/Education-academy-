import { describe, expect, it } from "vitest";
import type { WebStorageLike } from "./storage";
import {
  loadSubscription,
  loadUsage,
  saveSubscription,
  saveUsage,
  SUBSCRIPTION_KEY,
  USAGE_KEY,
} from "./subscriptionStorage";
import { createUsage, recordRoundStarted, subscribe } from "./subscription";

function fakeStorage(initial: Record<string, string> = {}): WebStorageLike & {
  items: Map<string, string>;
} {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

const NOW = new Date(2026, 6, 29, 12, 0, 0).getTime();

describe("saveSubscription / loadSubscription", () => {
  it("round-trips a subscription", () => {
    const storage = fakeStorage();
    const subscription = subscribe("yearly", NOW);

    saveSubscription(subscription, storage);

    expect(storage.items.has(SUBSCRIPTION_KEY)).toBe(true);
    expect(loadSubscription(storage)).toEqual(subscription);
  });

  it("reports the free tier when nothing is saved", () => {
    expect(loadSubscription(fakeStorage())).toBeNull();
    expect(loadSubscription(null)).toBeNull();
  });

  it("clears a saved subscription when the free tier is saved over it", () => {
    const storage = fakeStorage();
    saveSubscription(subscribe("monthly", NOW), storage);

    saveSubscription(null, storage);

    expect(loadSubscription(storage)).toBeNull();
  });

  it("falls back to the free tier on unreadable or malformed state", () => {
    expect(loadSubscription(fakeStorage({ [SUBSCRIPTION_KEY]: "not json {" }))).toBeNull();
    expect(loadSubscription(fakeStorage({ [SUBSCRIPTION_KEY]: '{"plan":"lifetime"}' }))).toBeNull();
    expect(
      loadSubscription(fakeStorage({ [SUBSCRIPTION_KEY]: '{"plan":"monthly","startedAt":1}' })),
    ).toBeNull();
    expect(loadSubscription(fakeStorage({ [SUBSCRIPTION_KEY]: "[]" }))).toBeNull();
  });

  it("survives storage that throws", () => {
    const throwing: WebStorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(loadSubscription(throwing)).toBeNull();
    expect(() => saveSubscription(subscribe("monthly", NOW), throwing)).not.toThrow();
  });
});

describe("saveUsage / loadUsage", () => {
  it("round-trips today's allowance", () => {
    const storage = fakeStorage();
    const usage = recordRoundStarted(createUsage(), NOW);

    saveUsage(usage, storage);

    expect(storage.items.has(USAGE_KEY)).toBe(true);
    expect(loadUsage(storage)).toEqual(usage);
  });

  it("reports an unused allowance when nothing is saved", () => {
    expect(loadUsage(fakeStorage())).toEqual(createUsage());
    expect(loadUsage(null)).toEqual(createUsage());
  });

  it("falls back to an unused allowance on unreadable or malformed state", () => {
    expect(loadUsage(fakeStorage({ [USAGE_KEY]: "not json {" }))).toEqual(createUsage());
    expect(loadUsage(fakeStorage({ [USAGE_KEY]: '{"day":1}' }))).toEqual(createUsage());
    expect(loadUsage(fakeStorage({ [USAGE_KEY]: "null" }))).toEqual(createUsage());
  });

  it("never loads a negative round count", () => {
    const storage = fakeStorage({ [USAGE_KEY]: '{"day":1,"rounds":-5}' });
    expect(loadUsage(storage).rounds).toBe(0);
  });

  it("is kept apart from the subscription and the progress history", () => {
    const storage = fakeStorage();
    saveUsage(recordRoundStarted(createUsage(), NOW), storage);
    saveSubscription(null, storage);

    expect(loadUsage(storage).rounds).toBe(1);
    expect(USAGE_KEY).not.toBe(SUBSCRIPTION_KEY);
  });
});
