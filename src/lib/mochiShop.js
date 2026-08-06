// Mochi cosmetics. Stars (earned by learning) buy fur colours, hats and glasses —
// giving stars a purpose and a reason to keep practising. Equipped look is read by
// Mochi.jsx so it shows everywhere; owned items live in synced progress state.

const KEY = "whisker.mochi";

export const COLOR_THEMES = {
  ginger:   { base: "#FF8A47", inner: "#FFB98A", muzzle: "#FFE3C9", deep: "#F26B2A", whisker: "#caa68f" },
  grey:     { base: "#9aa3ad", inner: "#c3c9d0", muzzle: "#eef1f4", deep: "#6c757d", whisker: "#aeb4ba" },
  midnight: { base: "#4b4f57", inner: "#6b7079", muzzle: "#cfd2d7", deep: "#2f3338", whisker: "#8a8f96" },
  snow:     { base: "#efece5", inner: "#f9f6f0", muzzle: "#ffffff", deep: "#cfc8bb", whisker: "#c4bdac" },
  mint:     { base: "#5fc9b0", inner: "#9fe0d2", muzzle: "#e8f8f3", deep: "#2f9e86", whisker: "#9ec9bf" },
  violet:   { base: "#9b7fd4", inner: "#c3b1e8", muzzle: "#efe9fa", deep: "#6b4fb0", whisker: "#b6a6d6" },
};

export const SHOP = {
  colors: [
    { id: "ginger",   name: "Ginger",   cost: 0 },
    { id: "grey",     name: "Grey",     cost: 60 },
    { id: "snow",     name: "Snow",     cost: 120 },
    { id: "midnight", name: "Midnight", cost: 150 },
    { id: "mint",     name: "Mint",     cost: 220 },
    { id: "violet",   name: "Violet",   cost: 300 },
  ],
  hats: [
    { id: "none",   name: "No hat",      cost: 0 },
    { id: "party",  name: "Party hat",   cost: 80 },
    { id: "wizard", name: "Wizard hat",  cost: 180 },
    { id: "crown",  name: "Crown",       cost: 250 },
  ],
  extras: [
    { id: "glasses", name: "Glasses", cost: 100 },
    { id: "streakfreeze", name: "Streak freeze", cost: 120 },
  ],
};

export const FREE = new Set(["ginger", "none"]);

export function getEquipped() {
  try {
    const e = JSON.parse(localStorage.getItem(KEY));
    if (e) return { color: e.color || "ginger", hat: e.hat || "none", glasses: !!e.glasses };
  } catch {}
  return { color: "ginger", hat: "none", glasses: false };
}
export function setEquipped(eq) { try { localStorage.setItem(KEY, JSON.stringify(eq)); } catch {} }

export function itemCost(id) {
  for (const arr of [SHOP.colors, SHOP.hats, SHOP.extras]) { const it = arr.find((x) => x.id === id); if (it) return it.cost; }
  return 0;
}
