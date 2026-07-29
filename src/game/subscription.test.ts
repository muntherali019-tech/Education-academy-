import { describe, expect, it } from "vitest";
import {
  ALL_PLANS,
  checkAccess,
  createUsage,
  FREE_ROUNDS_PER_DAY,
  isPlanId,
  isSubscribed,
  PLANS,
  recordRoundStarted,
  startOfDay,
  subscribe,
  usageForDay,
  type SubscriptionState,
  type Usage,
} from "./subscription";

const NOON = new Date(2026, 6, 29, 12, 0, 0).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

/** Usage as it would look after starting `rounds` rounds at `at`. */
function usageAfter(rounds: number, at: number = NOON): Usage {
  let usage = createUsage();
  for (let i = 0; i < rounds; i++) {
    usage = recordRoundStarted(usage, at);
  }
  return usage;
}

describe("plans", () => {
  it("offers a monthly and a yearly plan", () => {
    expect(ALL_PLANS.map((plan) => plan.id)).toEqual(["monthly", "yearly"]);
    expect(ALL_PLANS.every((plan) => plan.days > 0 && plan.price.includes("£"))).toBe(true);
  });

  it("recognises its own plan ids and nothing else", () => {
    expect(isPlanId("monthly")).toBe(true);
    expect(isPlanId("lifetime")).toBe(false);
  });
});

describe("subscribe", () => {
  it("runs from now until the plan's length is up", () => {
    const subscription = subscribe("monthly", NOON);
    expect(subscription).toEqual({
      plan: "monthly",
      startedAt: NOON,
      renewsAt: NOON + PLANS.monthly.days * DAY_MS,
    });
  });

  it("gives the yearly plan a longer run than the monthly one", () => {
    expect(subscribe("yearly", NOON).renewsAt).toBeGreaterThan(subscribe("monthly", NOON).renewsAt);
  });
});

describe("isSubscribed", () => {
  it("is false on the free tier", () => {
    expect(isSubscribed(null, NOON)).toBe(false);
  });

  it("is true while the subscription runs and false once it lapses", () => {
    const subscription = subscribe("monthly", NOON);
    expect(isSubscribed(subscription, NOON + DAY_MS)).toBe(true);
    expect(isSubscribed(subscription, subscription.renewsAt - 1)).toBe(true);
    expect(isSubscribed(subscription, subscription.renewsAt)).toBe(false);
    expect(isSubscribed(subscription, subscription.renewsAt + DAY_MS)).toBe(false);
  });
});

describe("usage", () => {
  it("starts empty", () => {
    expect(usageForDay(createUsage(), NOON).rounds).toBe(0);
  });

  it("counts rounds started today against today", () => {
    const usage = usageAfter(2);
    expect(usage).toEqual({ day: startOfDay(NOON), rounds: 2 });
  });

  it("does not mutate the usage it was given", () => {
    const before = usageAfter(1);
    recordRoundStarted(before, NOON);
    expect(before.rounds).toBe(1);
  });

  it("resets when the day rolls over", () => {
    const usage = usageAfter(FREE_ROUNDS_PER_DAY);
    expect(usageForDay(usage, NOON + DAY_MS).rounds).toBe(0);
    expect(recordRoundStarted(usage, NOON + DAY_MS)).toEqual({
      day: startOfDay(NOON + DAY_MS),
      rounds: 1,
    });
  });

  it("keeps counting up to the last minute of the day", () => {
    const lateEvening = new Date(2026, 6, 29, 23, 59, 0).getTime();
    expect(recordRoundStarted(usageAfter(1), lateEvening).rounds).toBe(2);
  });
});

describe("checkAccess", () => {
  it("gives a fresh device its full free allowance", () => {
    expect(checkAccess(createUsage(), null, NOON)).toEqual({
      subscribed: false,
      roundsToday: 0,
      freeRoundsLeft: FREE_ROUNDS_PER_DAY,
      canStartRound: true,
    });
  });

  it("counts the allowance down as rounds are started", () => {
    const access = checkAccess(usageAfter(1), null, NOON);
    expect(access.freeRoundsLeft).toBe(FREE_ROUNDS_PER_DAY - 1);
    expect(access.canStartRound).toBe(true);
  });

  it("closes the gate once the allowance is spent", () => {
    expect(checkAccess(usageAfter(FREE_ROUNDS_PER_DAY), null, NOON)).toMatchObject({
      freeRoundsLeft: 0,
      canStartRound: false,
    });
  });

  it("never reports a negative allowance", () => {
    expect(checkAccess(usageAfter(FREE_ROUNDS_PER_DAY + 5), null, NOON).freeRoundsLeft).toBe(0);
  });

  it("reopens the gate the next day", () => {
    const tomorrow = checkAccess(usageAfter(FREE_ROUNDS_PER_DAY), null, NOON + DAY_MS);
    expect(tomorrow).toMatchObject({ roundsToday: 0, canStartRound: true });
  });

  it("lifts the limit entirely while subscribed", () => {
    const access = checkAccess(
      usageAfter(FREE_ROUNDS_PER_DAY + 10),
      subscribe("monthly", NOON),
      NOON,
    );
    expect(access.subscribed).toBe(true);
    expect(access.freeRoundsLeft).toBe(Number.POSITIVE_INFINITY);
    expect(access.canStartRound).toBe(true);
  });

  it("falls back to the free allowance once a subscription lapses", () => {
    const lapsed: SubscriptionState = subscribe("monthly", NOON - 400 * DAY_MS);
    expect(checkAccess(usageAfter(FREE_ROUNDS_PER_DAY), lapsed, NOON)).toMatchObject({
      subscribed: false,
      canStartRound: false,
    });
    expect(checkAccess(createUsage(), lapsed, NOON).canStartRound).toBe(true);
  });
});
