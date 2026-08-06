import { describe, it, expect } from "vitest";
import { SHOP, FREE, itemCost, getEquipped, setEquipped } from "./mochiShop.js";

describe("itemCost", () => {
  it("returns the cost for colours, hats and extras", () => {
    expect(itemCost("ginger")).toBe(0);
    expect(itemCost("grey")).toBe(60);
    expect(itemCost("wizard")).toBe(180);
    expect(itemCost("glasses")).toBe(100);
    expect(itemCost("streakfreeze")).toBe(120);
  });

  it("returns 0 for an unknown item", () => {
    expect(itemCost("does-not-exist")).toBe(0);
  });

  it("marks the default items as free", () => {
    expect(FREE.has("ginger")).toBe(true);
    expect(FREE.has("none")).toBe(true);
    expect(FREE.has("crown")).toBe(false);
  });

  it("keeps SHOP ids and costs consistent with itemCost", () => {
    for (const arr of [SHOP.colors, SHOP.hats, SHOP.extras]) {
      for (const item of arr) expect(itemCost(item.id)).toBe(item.cost);
    }
  });
});

describe("getEquipped / setEquipped", () => {
  it("defaults to ginger, no hat, no glasses", () => {
    expect(getEquipped()).toEqual({ color: "ginger", hat: "none", glasses: false });
  });

  it("round-trips an equipped look through localStorage", () => {
    setEquipped({ color: "mint", hat: "crown", glasses: true });
    expect(getEquipped()).toEqual({ color: "mint", hat: "crown", glasses: true });
  });

  it("fills missing fields with defaults", () => {
    localStorage.setItem("whisker.mochi", JSON.stringify({ color: "violet" }));
    expect(getEquipped()).toEqual({ color: "violet", hat: "none", glasses: false });
  });

  it("falls back to defaults on corrupt storage", () => {
    localStorage.setItem("whisker.mochi", "{broken");
    expect(getEquipped()).toEqual({ color: "ginger", hat: "none", glasses: false });
  });
});
