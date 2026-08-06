// Achievements are derived from saved progress (no extra storage needed).
// They drive the "collect them all" loop that keeps learners coming back.

export const BADGES = [
  { id: "first",     icon: "🌟", name: "First steps",    desc: "Finish your first round" },
  { id: "star50",    icon: "⭐", name: "Star collector",  desc: "Earn 50 stars" },
  { id: "star250",   icon: "🌠", name: "Star master",     desc: "Earn 250 stars" },
  { id: "streak3",   icon: "🔥", name: "Daily learner",   desc: "3-day streak" },
  { id: "streak7",   icon: "🔥", name: "Week warrior",    desc: "7-day streak" },
  { id: "streak30",  icon: "🏆", name: "Monthly master",  desc: "30-day streak" },
  { id: "roll5",     icon: "🎯", name: "On a roll",       desc: "Get 5 right in a row" },
  { id: "roll10",    icon: "💥", name: "Unstoppable",     desc: "Get 10 right in a row" },
  { id: "perfect",   icon: "💯", name: "Perfect round",   desc: "Score 100% in a round" },
  { id: "subjects3", icon: "🧭", name: "Explorer",        desc: "Practise 3 different subjects" },
  { id: "course1",   icon: "🎓", name: "Scholar",         desc: "Pass an advanced course" },
  { id: "course3",   icon: "👑", name: "Graduate",        desc: "Pass 3 advanced courses" },
];

export function badgeStatus(state) {
  const stats = state?.stats || {};
  let rounds = 0, best = 0; const subjects = new Set();
  for (const [key, s] of Object.entries(stats)) {
    rounds += s.rounds || 0; best = Math.max(best, s.bestStreak || 0);
    if ((s.answered || 0) > 0) subjects.add(key.split(":")[1]);
  }
  const perfect = (state?.history || []).some((h) => h.total >= 5 && h.correct === h.total);
  const coursesPassed = (state?.courses || []).filter((c) => c.passed).length;
  const test = {
    first: rounds >= 1, star50: (state?.stars || 0) >= 50, star250: (state?.stars || 0) >= 250,
    streak3: (state?.streakDays || 0) >= 3, streak7: (state?.streakDays || 0) >= 7, streak30: (state?.streakDays || 0) >= 30,
    roll5: best >= 5, roll10: best >= 10, perfect,
    subjects3: subjects.size >= 3, course1: coursesPassed >= 1, course3: coursesPassed >= 3,
  };
  return BADGES.map((b) => ({ ...b, earned: !!test[b.id] }));
}

export const earnedCount = (state) => badgeStatus(state).filter((b) => b.earned).length;
