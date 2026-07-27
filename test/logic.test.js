// Loads the @logic block straight out of index.html and exercises it, so the
// tests validate the exact logic the app ships — no duplicated source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the @logic block out of index.html as a real ES module (data URL) so it
// runs in the host realm — objects compare cleanly and const exports work.
async function loadLogic() {
  const html = await readFile(join(__dirname, '..', 'index.html'), 'utf8');
  const start = html.indexOf('/* @logic:start');
  const end = html.indexOf('/* @logic:end */');
  assert.ok(start !== -1 && end !== -1, 'logic markers must exist in index.html');
  const code = html.slice(start, end) +
    '\nexport { STAGES, makeRng, generateQuestions, scoreRound, gradeFromPercent,' +
    ' warmFeedback, markHomework, hasAccess, progressSummary };';
  return import('data:text/javascript,' + encodeURIComponent(code));
}

const L = await loadLogic();

test('STAGES covers all four UK stages', () => {
  assert.deepEqual(Object.keys(L.STAGES).sort(), ['he', 'ks1', 'ks2', 'ks3']);
  assert.equal(L.STAGES.ks1.name, 'Key Stage 1');
});

test('generateQuestions returns 15 questions by default with 4 unique choices each', () => {
  const qs = L.generateQuestions('ks2');
  assert.equal(qs.length, 15);
  for (const q of qs) {
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4, 'choices are unique');
    assert.ok(q.choices.includes(q.answer), 'correct answer is among the choices');
    assert.equal(typeof q.answer, 'number');
  }
});

test('generateQuestions is deterministic for a fixed seed', () => {
  const a = L.generateQuestions('ks3', 15, 42);
  const b = L.generateQuestions('ks3', 15, 42);
  assert.deepEqual(a, b);
});

test('generateQuestions rejects unknown stages', () => {
  assert.throws(() => L.generateQuestions('nope'), /Unknown stage/);
});

test('scoreRound counts correct answers and computes percent', () => {
  const questions = [{ answer: 4 }, { answer: 9 }, { answer: 2 }, { answer: 7 }];
  const res = L.scoreRound([4, 9, 0, 7], questions);
  assert.equal(res.correct, 3);
  assert.equal(res.total, 4);
  assert.equal(res.percent, 75);
});

test('scoreRound treats string answers numerically', () => {
  const res = L.scoreRound(['4', '9'], [{ answer: 4 }, { answer: 9 }]);
  assert.equal(res.correct, 2);
});

test('gradeFromPercent maps bands', () => {
  assert.equal(L.gradeFromPercent(95), 'Purr-fect');
  assert.equal(L.gradeFromPercent(80), 'Top cat');
  assert.equal(L.gradeFromPercent(60), 'Good effort');
  assert.equal(L.gradeFromPercent(40), 'Keep pawing');
  assert.equal(L.gradeFromPercent(10), 'Kitten steps');
});

test('warmFeedback returns a grade and an encouraging message with the name', () => {
  const fb = L.warmFeedback(95, 'Sam');
  assert.equal(fb.grade, 'Purr-fect');
  assert.match(fb.message, /Sam/);
  const low = L.warmFeedback(10, 'Alex');
  assert.match(low.message, /Alex/);
  assert.ok(low.message.length > 0);
});

test('markHomework: strong work scores high with praise', () => {
  const r = L.markHomework({ legibility: 0.9, completeness: 1, accuracy: 0.95, effort: 0.9 }, 'maths');
  assert.ok(r.score >= 90, `expected high score, got ${r.score}`);
  assert.equal(r.grade, 'Purr-fect');
  assert.ok(r.feedback.some((f) => f.kind === 'praise'));
  assert.match(r.nextStep, /Play round/);
  assert.ok(r.warmMessage.length > 0);
});

test('markHomework: weak work scores low but stays kind and gives tips', () => {
  const r = L.markHomework({ legibility: 0.2, completeness: 0.3, accuracy: 0.2, effort: 0.3 }, 'english');
  assert.ok(r.score < 40, `expected low score, got ${r.score}`);
  assert.ok(r.feedback.some((f) => f.kind === 'tip'));
  assert.match(r.nextStep, /course/);
});

test('markHomework clamps out-of-range and missing signals', () => {
  const r = L.markHomework({ legibility: 5, completeness: -3, accuracy: 2 });
  assert.ok(r.score >= 0 && r.score <= 100);
});

test('markHomework accuracy dominates the score', () => {
  const high = L.markHomework({ legibility: 0, completeness: 0, accuracy: 1, effort: 0 });
  const low = L.markHomework({ legibility: 1, completeness: 1, accuracy: 0, effort: 1 });
  assert.ok(high.score > low.score, 'accuracy should outweigh the other signals');
});

test('hasAccess: premium is unlimited, free is limited and runs out', () => {
  assert.equal(L.hasAccess({ plan: 'premium' }, 'homework').allowed, true);
  assert.equal(L.hasAccess({ plan: 'premium' }, 'homework').remaining, Infinity);
  assert.equal(L.hasAccess({ plan: 'free', usedToday: 0 }, 'homework').allowed, true);
  assert.equal(L.hasAccess({ plan: 'free', usedToday: 3 }, 'homework').allowed, false);
  assert.equal(L.hasAccess({ plan: 'free', usedToday: 1 }, 'homework').remaining, 2);
});

test('hasAccess defaults sensibly with no subscription', () => {
  const r = L.hasAccess(undefined, 'round');
  assert.equal(r.allowed, true);
  assert.equal(r.remaining, 5);
});

test('progressSummary aggregates rounds, average and mastery', () => {
  const records = [
    { type: 'round', stage: 'ks1', percent: 80 },
    { type: 'round', stage: 'ks1', percent: 60 },
    { type: 'homework', stage: 'homework', percent: 90 },
    { type: 'course', stage: 'ks3' },
  ];
  const s = L.progressSummary(records);
  assert.equal(s.total, 4);
  assert.equal(s.roundsPlayed, 2);
  assert.equal(s.avgScore, 77); // (80+60+90)/3 = 76.67 -> 77
  assert.equal(s.mastered, 2); // ks1 best 80, homework best 90 (both >=75)
});

test('progressSummary handles an empty history', () => {
  const s = L.progressSummary([]);
  assert.deepEqual(s, { total: 0, roundsPlayed: 0, avgScore: 0, byStage: {}, mastered: 0 });
});
