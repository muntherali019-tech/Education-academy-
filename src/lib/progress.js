// Progress is saved to localStorage so it persists between visits on web and
// inside the Capacitor Android WebView. (This works in a real app, unlike the
// in-chat preview.) Replace with a server/account sync for multi-device use.

const KEY = "whisker.v1";

export function defaultState() {
  return { subs: { junior: false, adult: false }, stars: 0, history: [], stats: {}, courses: [], streakDays: 0, lastDay: null, starsToday: 0, dayStamp: null, dailyDay: null, freezes: 0, owned: [], mochi: { color: "ginger", hat: "none", glasses: false } };
}

export const DAILY_GOAL = 10;                       // stars per day to hit the daily goal
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

// Add stars and track how many were earned today (resets at midnight, local-ish via UTC date).
export function addStars(state, n = 1) {
  const today = dayKey();
  const starsToday = (state.dayStamp === today ? (state.starsToday || 0) : 0) + n;
  return { ...state, stars: (state.stars || 0) + n, starsToday, dayStamp: today };
}

// Update the consecutive-days streak. Call once when the learner does an activity.
// A "streak freeze" (bought in the shop) covers exactly one missed day.
export function touchStreak(state) {
  const today = dayKey();
  if (state.lastDay === today) return state;
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  if (state.lastDay === yesterday) return { ...state, streakDays: (state.streakDays || 0) + 1, lastDay: today };
  const twoAgo = dayKey(new Date(Date.now() - 2 * 86400000));
  if (state.lastDay === twoAgo && (state.freezes || 0) > 0 && (state.streakDays || 0) > 0) {
    return { ...state, streakDays: state.streakDays + 1, lastDay: today, freezes: state.freezes - 1 };
  }
  return { ...state, streakDays: 1, lastDay: today };
}

export const starsToday = (state) => (state?.dayStamp === dayKey() ? (state.starsToday || 0) : 0);

// Daily challenge: one bonus round per day.
export const dailyDone = (state) => state?.dailyDay === dayKey();
export function markDailyDone(state, bonus = 5) {
  if (state?.dailyDay === dayKey()) return state;
  return touchStreak(addStars({ ...state, dailyDay: dayKey() }, bonus));
}

export function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.stats) return { ...defaultState(), ...raw };
  } catch {}
  return defaultState();
}

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

// Log a finished round into stats + history. Stars are added live during play,
// so they are not changed here.
export function recordRound(state, { ks, subject, topic, total, correct, bestStreak }) {
  const key = `${ks}:${subject}`;
  const cur = state.stats[key] || { answered: 0, correct: 0, rounds: 0, bestStreak: 0, byTopic: {} };
  const t = cur.byTopic[topic] || { answered: 0, correct: 0 };
  const stats = {
    ...state.stats,
    [key]: {
      answered: cur.answered + total,
      correct: cur.correct + correct,
      rounds: cur.rounds + 1,
      bestStreak: Math.max(cur.bestStreak, bestStreak || 0),
      byTopic: { ...cur.byTopic, [topic]: { answered: t.answered + total, correct: t.correct + correct } },
    },
  };
  const history = [{ ts: Date.now(), ks, subject, topic, total, correct }, ...state.history].slice(0, 60);
  return { ...state, stats, history };
}

export function overview(state) {
  let answered = 0, correct = 0, rounds = 0, best = 0;
  Object.values(state.stats).forEach((s) => {
    answered += s.answered; correct += s.correct; rounds += s.rounds; best = Math.max(best, s.bestStreak);
  });
  return { answered, correct, rounds, best, accuracy: answered ? Math.round((correct / answered) * 100) : 0 };
}

// Topics with the lowest accuracy (at least a few attempts), for "needs practice".
export function weakestTopics(state, limit = 3) {
  const rows = [];
  Object.entries(state.stats).forEach(([key, s]) => {
    const [ks, subject] = key.split(":");
    Object.entries(s.byTopic).forEach(([topic, t]) => {
      if (t.answered >= 3) rows.push({ ks, subject, topic, accuracy: Math.round((t.correct / t.answered) * 100), answered: t.answered });
    });
  });
  return rows.sort((a, b) => a.accuracy - b.accuracy).slice(0, limit);
}

// Save a course module or mock-exam result (synced with the rest of state).
export function recordCourseResult(state, r) {
  return { ...state, courses: [{ ts: Date.now(), ...r }, ...(state.courses || [])].slice(0, 50) };
}
