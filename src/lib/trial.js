// A 72-hour free trial that unlocks all content from first start, then locks
// again unless subscribed. This is the app-level trial (works on web and before
// real billing). On native, also configure a 3-day free trial on the Play
// subscription so the store grants it at purchase time — see DEPLOYMENT.md.
const KEY = "whisker.trialStart";
const MS = 72 * 3600 * 1000;

export function startTrial() { try { if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, String(Date.now())); } catch {} }
export function trialStartedAt() { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } }
export function trialActive() { const s = trialStartedAt(); return s > 0 && Date.now() - s < MS; }
export function trialUsed() { return trialStartedAt() > 0; }
export function hoursLeft() { const s = trialStartedAt(); if (!s) return 0; return Math.max(0, Math.ceil((MS - (Date.now() - s)) / 3600000)); }
