// Caches AI-generated questions on the device so courses can be practised
// offline. Questions are saved automatically whenever they're generated online,
// and a "Save for offline" button can pre-download more. Stored in localStorage,
// which persists in the browser and inside the Capacitor Android WebView.
const KEY = "whisker.exambank.v1";
const MAX_PER_COURSE = 300;

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function save(bank) { try { localStorage.setItem(KEY, JSON.stringify(bank)); } catch {} }

export function isOnline() { try { return navigator.onLine !== false; } catch { return true; } }
export function getCached(courseId) { return load()[courseId] || []; }
export function cachedCount(courseId) { return getCached(courseId).length; }

// Add only well-formed, de-duplicated questions; returns the new total.
export function addToCache(courseId, questions = []) {
  const bank = load();
  const cur = bank[courseId] || [];
  const seen = new Set(cur.map((q) => String(q.q || "").trim().toLowerCase()));
  for (const q of questions) {
    const k = String(q?.q || "").trim().toLowerCase();
    if (q?.q && Array.isArray(q.options) && q.options.length >= 2 && !seen.has(k)) {
      seen.add(k);
      cur.push({ q: q.q, options: q.options, answerIndex: Number(q.answerIndex) || 0, why: q.why || "" });
    }
  }
  bank[courseId] = cur.slice(-MAX_PER_COURSE);
  save(bank);
  return bank[courseId].length;
}

function shuffle(a) { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }
export function sampleCached(courseId, count) { return shuffle(getCached(courseId)).slice(0, count); }
