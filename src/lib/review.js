// Play In-App Review (Android). Uses the native dialog via a Capacitor plugin if
// present; on the web it falls back to opening the Play listing (manual only).
//   npm install @capacitor-community/in-app-review   (then: npx cap sync)
// Google decides whether to actually show the dialog and never tells you the result,
// so trigger it after a positive moment — and don't nag.
const PKG = "@capacitor-community/in-app-review";
const PLAY_URL = import.meta.env.VITE_PLAY_URL || "https://play.google.com/store/apps/details?id=com.educationacademy.app";

async function pluginReview() {
  const mod = await import(/* @vite-ignore */ PKG);
  const InAppReview = mod.InAppReview || mod.default;
  if (!InAppReview?.requestReview) throw new Error("no plugin");
  await InAppReview.requestReview();
}

// Manual "Rate us" action: native dialog if available, else open the Play listing.
export async function requestReview() {
  try { await pluginReview(); return true; }
  catch { try { window.open(PLAY_URL, "_blank", "noopener"); } catch {} return false; }
}

// Automatic, gentle prompt after a positive moment. Silent on web (no plugin),
// and rate-limited to at most once every 30 days.
export function maybeRequestReview() {
  try {
    const last = Number(localStorage.getItem("whisker.reviewAskedAt") || 0);
    if (Date.now() - last < 30 * 24 * 3600 * 1000) return;
    localStorage.setItem("whisker.reviewAskedAt", String(Date.now()));
  } catch {}
  pluginReview().catch(() => {}); // do nothing if the native plugin isn't there
}
