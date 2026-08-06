// Daily local reminder to keep streaks alive. Uses Capacitor Local Notifications on the
// installed app. The import is guarded so the web build (where it isn't installed) just
// reports "unsupported" instead of crashing. To enable on the app:  npm install @capacitor/local-notifications

const KEY = "whisker.reminder";
const ID = 4321;

export function getPref() {
  try { const p = JSON.parse(localStorage.getItem(KEY)); if (p) return { on: !!p.on, hour: p.hour ?? 16, minute: p.minute ?? 30 }; } catch {}
  return { on: false, hour: 16, minute: 30 };
}
export function setPref(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} }

async function LN() { const m = await import("@capacitor/local-notifications"); return m.LocalNotifications || m.default?.LocalNotifications; }

export async function enable(hour, minute) {
  try {
    const ln = await LN(); if (!ln) return { ok: false, unsupported: true };
    const perm = await ln.requestPermissions();
    if (perm?.display && perm.display !== "granted") return { ok: false, denied: true };
    await ln.cancel({ notifications: [{ id: ID }] }).catch(() => {});
    await ln.schedule({ notifications: [{ id: ID, title: "Time to learn with Mochi 🐱", body: "A quick round keeps your streak alive!", schedule: { on: { hour, minute }, repeats: true } }] });
    setPref({ on: true, hour, minute });
    return { ok: true };
  } catch { return { ok: false, unsupported: true }; }
}

export async function disable() {
  try { const ln = await LN(); if (ln) await ln.cancel({ notifications: [{ id: ID }] }).catch(() => {}); } catch {}
  setPref({ ...getPref(), on: false });
  return { ok: true };
}
