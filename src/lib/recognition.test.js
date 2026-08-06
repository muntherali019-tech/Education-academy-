import { describe, it, expect } from "vitest";
import { roughMatch } from "./recognition.js";

describe("roughMatch", () => {
  it("matches identical strings", () => {
    expect(roughMatch("hello", "hello")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(roughMatch("Bonjour", "bonjour")).toBe(true);
  });

  it("ignores punctuation and spaces", () => {
    expect(roughMatch("¡Hola, amigo!", "hola amigo")).toBe(true);
  });

  it("ignores accents (diacritics)", () => {
    expect(roughMatch("café", "cafe")).toBe(true);
    expect(roughMatch("niño", "nino")).toBe(true);
  });

  it("credits a substring attempt (said contains target)", () => {
    expect(roughMatch("the answer is bonjour ok", "bonjour")).toBe(true);
  });

  it("credits a substring attempt (target contains said)", () => {
    expect(roughMatch("bon", "bonjour")).toBe(true);
  });

  it("rejects clearly different words", () => {
    expect(roughMatch("goodbye", "bonjour")).toBe(false);
  });

  it("rejects when either side is empty after normalization", () => {
    expect(roughMatch("!!!", "bonjour")).toBe(false);
    expect(roughMatch("", "")).toBe(false);
  });
});
