// Share via the device share sheet when available, otherwise copy to clipboard.
// Returns true (shared), "copied", or false.
const SITE = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_PUBLIC_URL)
  || (typeof window !== "undefined" && window.location ? window.location.origin : "");

export function siteUrl() { return SITE || ""; }

export async function share({ title = "Education Academy", text = "", url = SITE } = {}) {
  try {
    if (typeof navigator !== "undefined" && navigator.share) { await navigator.share({ title, text, url }); return true; }
  } catch { /* user cancelled or unsupported */ }
  try {
    const payload = `${text} ${url || ""}`.trim();
    if (typeof navigator !== "undefined" && navigator.clipboard) { await navigator.clipboard.writeText(payload); return "copied"; }
  } catch {}
  return false;
}
