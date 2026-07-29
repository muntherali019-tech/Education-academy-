import {
  createUsage,
  isPlanId,
  type Subscription,
  type SubscriptionState,
  type Usage,
} from "./subscription";
import { defaultStorage, readJson, writeJson, type WebStorageLike } from "./storage";

export const SUBSCRIPTION_KEY = "education-academy:subscription:v1";
export const USAGE_KEY = "education-academy:usage:v1";

function parseSubscription(value: unknown): Subscription | null {
  const subscription = value as Record<string, unknown>;
  if (
    typeof subscription?.plan !== "string" ||
    !isPlanId(subscription.plan) ||
    typeof subscription.startedAt !== "number" ||
    typeof subscription.renewsAt !== "number"
  ) {
    return null;
  }
  return {
    plan: subscription.plan,
    startedAt: subscription.startedAt,
    renewsAt: subscription.renewsAt,
  };
}

/** Unreadable or malformed state falls back to the free tier. */
export function loadSubscription(
  storage: WebStorageLike | null = defaultStorage(),
): SubscriptionState {
  return readJson(SUBSCRIPTION_KEY, parseSubscription, storage);
}

export function saveSubscription(
  subscription: SubscriptionState,
  storage: WebStorageLike | null = defaultStorage(),
): void {
  writeJson(SUBSCRIPTION_KEY, subscription, storage);
}

function parseUsage(value: unknown): Usage | null {
  const usage = value as Record<string, unknown>;
  if (typeof usage?.day !== "number" || typeof usage.rounds !== "number") {
    return null;
  }
  // A negative count could only come from tampering; treat it as unused.
  return { day: usage.day, rounds: Math.max(0, usage.rounds) };
}

/** Unreadable or malformed state falls back to an unused allowance. */
export function loadUsage(storage: WebStorageLike | null = defaultStorage()): Usage {
  return readJson(USAGE_KEY, parseUsage, storage) ?? createUsage();
}

export function saveUsage(usage: Usage, storage: WebStorageLike | null = defaultStorage()): void {
  writeJson(USAGE_KEY, usage, storage);
}
