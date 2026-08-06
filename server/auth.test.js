import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signToken, verifyToken } from "./auth.js";

describe("password hashing", () => {
  it("produces a salt+hash that verifies", () => {
    const { salt, hash } = hashPassword("correct horse");
    expect(salt).toMatch(/^[0-9a-f]+$/);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(verifyPassword("correct horse", salt, hash)).toBe(true);
  });

  it("uses a random salt so two hashes of the same password differ", () => {
    const a = hashPassword("same");
    const b = hashPassword("same");
    expect(a.hash).not.toBe(b.hash);
  });

  it("rejects the wrong password", () => {
    const { salt, hash } = hashPassword("secret");
    expect(verifyPassword("guess", salt, hash)).toBe(false);
  });

  it("returns false (does not throw) on malformed salt/hash", () => {
    expect(verifyPassword("x", "not-hex", "also-not-hex")).toBe(false);
    expect(verifyPassword("x", "aa", "")).toBe(false);
  });

  it("coerces non-string passwords", () => {
    const { salt, hash } = hashPassword(12345);
    expect(verifyPassword(12345, salt, hash)).toBe(true);
  });
});

describe("tokens", () => {
  it("signs and verifies a payload round-trip", () => {
    const token = signToken({ uid: "user-1" });
    const payload = verifyToken(token);
    expect(payload.uid).toBe("user-1");
    expect(typeof payload.iat).toBe("number");
  });

  it("rejects a tampered body", () => {
    const [, sig] = signToken({ uid: "user-1" }).split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "attacker", iat: Date.now() })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const [body] = signToken({ uid: "user-1" }).split(".");
    expect(verifyToken(`${body}.deadbeef`)).toBeNull();
  });

  it("rejects empty, malformed and null tokens", () => {
    expect(verifyToken("")).toBeNull();
    expect(verifyToken(null)).toBeNull();
    expect(verifyToken("no-dot")).toBeNull();
    expect(verifyToken("a.b.c")).toBeNull();
  });
});
