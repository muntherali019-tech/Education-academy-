// Privacy-first, first-party analytics.
//
// This keeps the app's "no third-party tracking, COPPA / UK Children's Code" promise:
//   • No third-party scripts, cookies, fingerprinting, or ad/tracking pixels.
//   • No personal data and no per-user identifiers are ever sent — only the *name* of a
//     whitelisted product event (e.g. "trial_start"). The server stores anonymous daily
//     counts, so it powers a conversion funnel without profiling anyone.
//   • Respects a local opt-out and the browser's Do-Not-Track signal.
//
// Add new event names to EVENTS below; anything not whitelisted is dropped on both ends.
const API = import.meta.env.VITE_API_BASE || "/api";

// The conversion funnel + a few key product signals. Keep this list small and non-identifying.
export const EVENTS = new Set([
  "app_open",
  "trial_start",
  "paywall_view",
  "plans_view",
  "checkout_start",
  "purchase_success",
  "round_complete",
  "invite_click",
]);

function optedOut() {
  try {
    if (localStorage.getItem("whisker.noAnalytics") === "1") return true;
    // Honour Do-Not-Track where the browser exposes it.
    const dnt = navigator.doNotTrack || window.doNotTrack;
    return dnt === "1" || dnt === "yes";
  } catch { return false; }
}

// Let a grown-up turn measurement off (e.g. a settings toggle).
export function setOptOut(off) { try { localStorage.setItem("whisker.noAnalytics", off ? "1" : "0"); } catch {} }
export function isOptedOut() { return optedOut(); }

// Fire-and-forget: never throws, never blocks the UI, and silently no-ops when opted out.
export function track(name) {
  if (!EVENTS.has(name) || optedOut()) return;
  try {
    const body = JSON.stringify({ name });
    // sendBeacon survives page navigation (e.g. redirect to Stripe); fall back to fetch.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API}/event`, new Blob([body], { type: "application/json" }));
    } else {
      fetch(`${API}/event`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* analytics must never break the app */ }
}
