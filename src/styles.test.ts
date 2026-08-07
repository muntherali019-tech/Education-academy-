import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// WCAG 2.1 AA contrast guard for the palette in src/styles.css. The audience is
// children and schools, so text has to stay legible: normal text needs 4.5:1,
// large text (>=18.66px bold / 24px) and graphical elements 3:1. Tokens are read
// back out of the stylesheet so a palette edit fails here instead of silently
// regressing the app.

// Resolved from the project root: the suite runs under jsdom, where
// import.meta.url is not a file: URL.
const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

/** Read a `--name: #hex` custom property out of the stylesheet. */
function token(name: string): string {
  const match = css.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{3,6})`));
  if (!match?.[1]) throw new Error(`token --${name} not found in src/styles.css`);
  return match[1];
}

function channels(hex: string): number[] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const ginger = token("ginger");
const gingerText = token("ginger-text");
const ink = token("ink");
const cream = token("cream");
const paper = "#ffffff";
const muted = "#7a6a60";

// Text that has to clear 4.5:1. `.tile-value` and `.score` are large enough to
// qualify for the 3:1 rule, but they share --ginger-text with `.price` and
// `.step::before`, which do not — so the token is held to the stricter bar.
const normalText: Array<[string, string, string]> = [
  ["body — ink on cream", ink, cream],
  ["cards — ink on white", ink, paper],
  [".tagline / .ages / .note — muted on cream", muted, cream],
  [".tile-label / .blurb / thead th — muted on white", muted, paper],
  [".quit / .link — underlined muted link on cream", muted, cream],
  [".price / .step::before — ginger-text on white", gingerText, paper],
  [".tile-value / .score — ginger-text on white", gingerText, paper],
  [".price — ginger-text on cream", gingerText, cream],
  [".badge.pass — on its green background", "#1e7b34", "#e6f4ea"],
  [".badge.fail — on its red background", "#a5342c", "#fdeceb"],
  [".marking-error — on its amber background", "#8a4b1d", "#fdece0"],
  [".step-working — ink on cream", ink, cream],
];

describe("colour palette meets WCAG AA", () => {
  it.each(normalText)("%s clears 4.5:1", (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps --ginger-text strictly darker than the --ginger fill", () => {
    // The bright brand orange is for fills, borders and the progress bar; text
    // uses the darker variant. If they ever converge, the split is pointless.
    expect(luminance(gingerText)).toBeLessThan(luminance(ginger));
  });

  it("does not use the --ginger fill as a text colour", () => {
    // `color: var(--ginger)` is 2.71:1 on white — the regression this guards.
    // The leading [^-] keeps `border-color: var(--ginger)` out of the match:
    // borders are graphical, so the bright fill is fine there.
    expect(css).not.toMatch(/[^-]color:\s*var\(--ginger\)\s*;/);
  });
});
