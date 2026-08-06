// Realistic sample content for a believable live demo — NOT lorem ipsum.
// Loading this fills the parent dashboard with a plausible KS2 learner ("Ava")
// who has a few weeks of activity: strong times tables and spelling, and some
// genuinely weak topics (fractions, percentages, apostrophes) so "needs
// practice" looks real. Wired from the dashboard when there is no real activity,
// so nothing of the user's is ever overwritten. Cleared by "Reset progress".

const ago = (days) => Date.now() - Math.round(days * 86400000);

// stats are keyed `${ks}:${subject}`; byTopic sums must match answered/correct.
const MATHS = {
  answered: 107, correct: 79, rounds: 7, bestStreak: 9,
  byTopic: {
    "Times tables": { answered: 30, correct: 27 },
    "Place value": { answered: 15, correct: 14 },
    "Word problems": { answered: 20, correct: 16 },
    "Fractions": { answered: 24, correct: 13 },      // weak ~54%
    "Percentages": { answered: 18, correct: 9 },     // weak 50%
  },
};
const ENGLISH = {
  answered: 75, correct: 61, rounds: 5, bestStreak: 11,
  byTopic: {
    "Spelling": { answered: 30, correct: 28 },
    "Homophones": { answered: 15, correct: 12 },
    "Synonyms": { answered: 15, correct: 13 },
    "Apostrophes": { answered: 15, correct: 8 },      // weak 53%
  },
};

// Newest first, matching recordRound()'s history shape.
const HISTORY = [
  { ts: ago(0.3), ks: "ks2", subject: "maths",   topic: "Times tables",  total: 15, correct: 14 },
  { ts: ago(0.9), ks: "ks2", subject: "english", topic: "Spelling",      total: 15, correct: 15 },
  { ts: ago(1.8), ks: "ks2", subject: "maths",   topic: "Fractions",     total: 15, correct: 8  },
  { ts: ago(2.6), ks: "ks2", subject: "english", topic: "Apostrophes",   total: 15, correct: 8  },
  { ts: ago(3.4), ks: "ks2", subject: "maths",   topic: "Percentages",   total: 15, correct: 7  },
  { ts: ago(4.2), ks: "ks2", subject: "maths",   topic: "Word problems", total: 15, correct: 13 },
  { ts: ago(5.1), ks: "ks2", subject: "english", topic: "Synonyms",      total: 15, correct: 13 },
  { ts: ago(6.0), ks: "ks2", subject: "maths",   topic: "Place value",   total: 15, correct: 14 },
  { ts: ago(7.3), ks: "ks2", subject: "english", topic: "Homophones",    total: 15, correct: 12 },
  { ts: ago(8.4), ks: "ks2", subject: "maths",   topic: "Times tables",  total: 15, correct: 13 },
];

// Fills over defaultState() (see progress.js) so the schema stays complete.
export function demoState() {
  return {
    subs: { junior: true, adult: false },
    stars: 342,
    history: HISTORY,
    stats: { "ks2:maths": MATHS, "ks2:english": ENGLISH },
    courses: [],
    streakDays: 6, lastDay: new Date().toISOString().slice(0, 10),
    starsToday: 14, dayStamp: new Date().toISOString().slice(0, 10),
    dailyDay: null, freezes: 1,
    owned: ["midnight", "wizard"],
    mochi: { color: "midnight", hat: "wizard", glasses: true },
    _demo: true,
  };
}

// A curated, real sample round (KS2 fractions) so "try a round" shows genuine
// content offline — same shape generateQuestions() returns.
export const DEMO_ROUND = {
  ks: "ks2", subject: "maths", topic: "Fractions",
  questions: [
    { question: "Which fraction is equal to one half?", choices: ["2/5", "3/6", "2/3", "1/4"], answerIndex: 1, explanation: "3/6 simplifies to 1/2 because 3 is half of 6." },
    { question: "What is 1/4 of 20?", choices: ["4", "5", "8", "10"], answerIndex: 1, explanation: "A quarter means divide by 4, and 20 ÷ 4 = 5." },
    { question: "Which fraction is the largest?", choices: ["1/2", "1/3", "1/5", "1/8"], answerIndex: 0, explanation: "With the same numerator, the smallest denominator gives the largest fraction, so 1/2 is biggest." },
    { question: "What is 3/4 + 1/4?", choices: ["4/8", "1", "3/8", "1/2"], answerIndex: 1, explanation: "3 quarters plus 1 quarter makes 4 quarters, which is one whole." },
    { question: "What is 2/3 of 9?", choices: ["3", "5", "6", "7"], answerIndex: 2, explanation: "9 ÷ 3 = 3 for one third, and two thirds is 3 × 2 = 6." },
  ],
};
