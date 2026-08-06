import { describe, it, expect } from "vitest";
import { getCached, cachedCount, addToCache, sampleCached } from "./examCache.js";

const q = (text, over = {}) => ({ q: text, options: ["a", "b", "c", "d"], answerIndex: 1, why: "w", ...over });

describe("addToCache", () => {
  it("stores well-formed questions and returns the new total", () => {
    const total = addToCache("gas", [q("What is X?"), q("What is Y?")]);
    expect(total).toBe(2);
    expect(cachedCount("gas")).toBe(2);
  });

  it("de-duplicates by question text, case/space-insensitively", () => {
    addToCache("gas", [q("What is X?")]);
    const total = addToCache("gas", [q("  what IS x? "), q("Something new")]);
    expect(total).toBe(2); // the duplicate was skipped
  });

  it("rejects malformed questions (missing text or <2 options)", () => {
    const total = addToCache("gas", [
      q(""),                                   // no text
      { options: ["a", "b"] },                 // no q
      { q: "only one", options: ["a"] },       // too few options
      q("Valid one"),
    ]);
    expect(total).toBe(1);
  });

  it("normalizes answerIndex to a number, defaulting to 0", () => {
    addToCache("gas", [q("Numbered", { answerIndex: "3" }), q("Bad idx", { answerIndex: undefined })]);
    const cached = getCached("gas");
    expect(cached.find((x) => x.q === "Numbered").answerIndex).toBe(3);
    expect(cached.find((x) => x.q === "Bad idx").answerIndex).toBe(0);
  });

  it("keeps caches per course separate", () => {
    addToCache("gas", [q("Gas Q")]);
    addToCache("electrical", [q("Elec Q")]);
    expect(cachedCount("gas")).toBe(1);
    expect(cachedCount("electrical")).toBe(1);
  });

  it("caps a course at 300 questions", () => {
    const many = Array.from({ length: 320 }, (_, i) => q("Q number " + i));
    const total = addToCache("gas", many);
    expect(total).toBe(300);
  });
});

describe("getCached / sampleCached", () => {
  it("returns an empty array for an unknown course", () => {
    expect(getCached("nope")).toEqual([]);
  });

  it("samples at most `count` cached questions", () => {
    addToCache("gas", Array.from({ length: 10 }, (_, i) => q("Q" + i)));
    expect(sampleCached("gas", 4)).toHaveLength(4);
    expect(sampleCached("gas", 50)).toHaveLength(10);
  });
});
