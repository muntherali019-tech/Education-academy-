/** Rounds a learner can start each day before the paywall appears. */
export const FREE_ROUNDS_PER_DAY = 3;

export const PLAN_IDS = ["monthly", "yearly"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export interface Plan {
  id: PlanId;
  name: string;
  /** Display price, already formatted for the UK. */
  price: string;
  /** How long one payment covers. */
  days: number;
  blurb: string;
}

export const PLANS: Record<PlanId, Plan> = {
  monthly: {
    id: "monthly",
    name: "Mochi Monthly",
    price: "£4.99 / month",
    days: 30,
    blurb: "Unlimited rounds for the whole family. Cancel any time.",
  },
  yearly: {
    id: "yearly",
    name: "Mochi Yearly",
    price: "£39.99 / year",
    days: 365,
    blurb: "Unlimited rounds all year — two months cheaper than monthly.",
  },
};

export const ALL_PLANS: Plan[] = PLAN_IDS.map((id) => PLANS[id]);

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

export interface Subscription {
  plan: PlanId;
  startedAt: number;
  /** Epoch milliseconds; access lapses once this passes. */
  renewsAt: number;
}

/** `null` means the free tier — nobody has subscribed on this device. */
export type SubscriptionState = Subscription | null;

const DAY_MS = 24 * 60 * 60 * 1000;

export function subscribe(plan: PlanId, now: number = Date.now()): Subscription {
  return { plan, startedAt: now, renewsAt: now + PLANS[plan].days * DAY_MS };
}

export function isSubscribed(
  subscription: SubscriptionState,
  now: number = Date.now(),
): subscription is Subscription {
  return subscription !== null && subscription.renewsAt > now;
}

/** Midnight local time, so the allowance resets on the learner's own day. */
export function startOfDay(at: number): number {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * The free allowance is metered on its own counter rather than on the
 * dashboard's round history, so clearing that history cannot hand back free
 * rounds.
 */
export interface Usage {
  /** Midnight of the day these rounds were started, in local time. */
  day: number;
  rounds: number;
}

export function createUsage(): Usage {
  return { day: 0, rounds: 0 };
}

/** Today's counter, reset to zero when the day has rolled over. */
export function usageForDay(usage: Usage, now: number = Date.now()): Usage {
  const day = startOfDay(now);
  return usage.day === day ? usage : { day, rounds: 0 };
}

/** Count a round against today's allowance. Returns new usage; never mutates. */
export function recordRoundStarted(usage: Usage, now: number = Date.now()): Usage {
  const today = usageForDay(usage, now);
  return { day: today.day, rounds: today.rounds + 1 };
}

export interface Access {
  subscribed: boolean;
  roundsToday: number;
  /** Free rounds left today; `Infinity` while subscribed. */
  freeRoundsLeft: number;
  canStartRound: boolean;
}

/**
 * What this device may do right now. Rounds already under way are unaffected —
 * the gate is only checked when a new round starts.
 */
export function checkAccess(
  usage: Usage,
  subscription: SubscriptionState,
  now: number = Date.now(),
): Access {
  const subscribed = isSubscribed(subscription, now);
  const roundsToday = usageForDay(usage, now).rounds;
  const freeRoundsLeft = subscribed
    ? Number.POSITIVE_INFINITY
    : Math.max(0, FREE_ROUNDS_PER_DAY - roundsToday);
  return { subscribed, roundsToday, freeRoundsLeft, canStartRound: freeRoundsLeft > 0 };
}
