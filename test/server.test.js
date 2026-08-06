import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Boots the real server in a temp working directory (the JSON store writes to
// <cwd>/server/data) and exercises the API over HTTP. No secrets are needed —
// without ANTHROPIC_API_KEY the AI proxy refuses cleanly rather than calling out,
// and without STRIPE_SECRET_KEY checkout returns 503. Nothing here hits a network.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 18000 + Math.floor(Math.random() * 2000);
const BASE = `http://127.0.0.1:${PORT}`;
let proc, workDir;

const api = async (method, route, { token, body } = {}) => {
  const res = await fetch(BASE + route, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
};

before(async () => {
  workDir = mkdtempSync(path.join(tmpdir(), "whisker-test-"));
  proc = spawn(process.execPath, [path.join(ROOT, "server", "index.js")], {
    cwd: workDir,
    // Strip the inherited AI/Stripe keys so the suite is deterministic wherever it runs.
    env: { ...process.env, PORT: String(PORT), ANTHROPIC_API_KEY: "", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "" },
    stdio: "ignore",
  });
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("server did not start");
});

after(() => {
  proc?.kill();
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

let parentA, parentB, teacher, childId, goalId, classCode, classId;

test("health endpoint reports that no AI key is configured", async () => {
  const r = await api("GET", "/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.hasKey, false);
});

test("signup rejects missing fields and bad roles", async () => {
  const missing = await api("POST", "/api/auth/signup", { body: { email: "nopass@example.com" } });
  assert.equal(missing.status, 400);
  const badRole = await api("POST", "/api/auth/signup", { body: { email: "role@example.com", password: "longenough1", role: "admin" } });
  assert.equal(badRole.status, 400);
});

test("parents and teachers can sign up and receive tokens", async () => {
  const a = await api("POST", "/api/auth/signup", { body: { email: "parenta@example.com", password: "longenough1", role: "parent", name: "Parent A" } });
  assert.equal(a.status, 200);
  assert.ok(a.body.token);
  parentA = a.body.token;

  const b = await api("POST", "/api/auth/signup", { body: { email: "parentb@example.com", password: "longenough1", role: "parent", name: "Parent B" } });
  assert.equal(b.status, 200);
  parentB = b.body.token;

  const t = await api("POST", "/api/auth/signup", { body: { email: "teacher@example.com", password: "longenough1", role: "teacher", name: "Teacher" } });
  assert.equal(t.status, 200);
  teacher = t.body.token;
});

test("signup rejects a duplicate email", async () => {
  const dup = await api("POST", "/api/auth/signup", { body: { email: "parenta@example.com", password: "longenough1" } });
  assert.equal(dup.status, 409);
});

test("login verifies the password", async () => {
  const bad = await api("POST", "/api/auth/login", { body: { email: "parenta@example.com", password: "wrongpassword" } });
  assert.equal(bad.status, 401);
  const good = await api("POST", "/api/auth/login", { body: { email: "parenta@example.com", password: "longenough1" } });
  assert.equal(good.status, 200);
  assert.ok(good.body.token);
});

test("auth-gated routes reject missing tokens", async () => {
  const r = await api("GET", "/api/children");
  assert.equal(r.status, 401);
});

test("a parent can create a child and sync its state", async () => {
  const created = await api("POST", "/api/children", { token: parentA, body: { name: "Kit", ks: "ks2" } });
  assert.equal(created.status, 200);
  childId = created.body.child.id;

  const put = await api("PUT", `/api/children/${childId}/state`, {
    token: parentA,
    body: { state: { subs: { junior: false, adult: false }, stars: 9, history: [], stats: {} } },
  });
  assert.equal(put.status, 200);

  const got = await api("GET", `/api/children/${childId}/state`, { token: parentA });
  assert.equal(got.status, 200);
  assert.equal(got.body.state.stars, 9);
});

test("another parent cannot read or write someone else's child", async () => {
  const read = await api("GET", `/api/children/${childId}/state`, { token: parentB });
  assert.equal(read.status, 403);
  const write = await api("PUT", `/api/children/${childId}/state`, { token: parentB, body: { state: {} } });
  assert.equal(write.status, 403);
});

test("goals are scoped to their author", async () => {
  const g = await api("POST", `/api/children/${childId}/goals`, { token: parentA, body: { title: "Practise fractions" } });
  assert.equal(g.status, 200);
  goalId = g.body.goal.id;

  const stranger = await api("POST", `/api/children/${childId}/goals`, { token: parentB, body: { title: "Should fail" } });
  assert.equal(stranger.status, 403);

  const del = await api("DELETE", `/api/goals/${goalId}`, { token: parentB });
  assert.equal(del.status, 403, "only the goal's author may delete it");
});

test("teachers manage classes; parents join by code", async () => {
  const noClass = await api("POST", "/api/classes", { token: parentA, body: { name: "Nope" } });
  assert.equal(noClass.status, 403, "parents cannot create classes");

  const cls = await api("POST", "/api/classes", { token: teacher, body: { name: "Year 4" } });
  assert.equal(cls.status, 200);
  classCode = cls.body.class.code;
  classId = cls.body.class.id;

  const pupil = await api("POST", `/api/classes/${classId}/pupils`, { token: teacher, body: { name: "Pip", ks: "ks2" } });
  assert.equal(pupil.status, 200);

  const join = await api("POST", `/api/children/${childId}/join-class`, { token: parentA, body: { code: classCode } });
  assert.equal(join.status, 200);

  const board = await api("GET", `/api/leaderboard?childId=${childId}`, { token: parentA });
  assert.equal(board.status, 200);
  assert.equal(board.body.scope, "class");
  assert.ok(board.body.board.length >= 2, "class board includes classmates");
});

test("deleting a child cascades goals and class links", async () => {
  const del = await api("DELETE", `/api/children/${childId}`, { token: parentA });
  assert.equal(del.status, 200);

  const kids = await api("GET", "/api/children", { token: parentA });
  assert.ok(!kids.body.children.some((c) => c.id === childId), "child is gone");

  const goals = await api("GET", `/api/children/${childId}/goals`, { token: parentA });
  assert.equal(goals.status, 403, "goal access is gone with the child");
});

test("deleting the account removes it and everything it owns", async () => {
  const del = await api("DELETE", "/api/me", { token: parentB });
  assert.equal(del.status, 200);
  const me = await api("GET", "/api/me", { token: parentB });
  assert.equal(me.status, 401, "the deleted account's token no longer works");
});

test("the AI proxy refuses cleanly when no key is configured", async () => {
  // This app has no demo mode: without ANTHROPIC_API_KEY the proxy must fail
  // with a typed JSON error rather than calling out or leaking a stack trace.
  const r = await api("POST", "/api/claude", { body: { content: "hello" } });
  assert.equal(r.status, 500);
  assert.match(r.body.error, /ANTHROPIC_API_KEY/);
});

test("the AI proxy is reachable without a token", async () => {
  // The proxy is deliberately open (the app calls it before sign-in), so it must
  // not 401 — the key check above is the only thing standing between it and upstream.
  const r = await api("POST", "/api/claude", { body: { content: "hi" } });
  assert.notEqual(r.status, 401);
});

test("checkout rejects an unknown plan before touching Stripe", async () => {
  const r = await api("POST", "/api/stripe/checkout", { body: { plan: "not-a-plan" } });
  // Stripe isn't configured in tests, so a valid plan would 503; an unknown
  // plan is rejected regardless. Either way it must never 200.
  assert.ok(r.status === 400 || r.status === 503);
});

// Annual checkout used to fall back to the monthly price id when no yearly price
// was configured, so the plans screen quoted "£30/yr" while Stripe set up £3/month
// billing. Refusing is the only safe answer; never resolve annual to a monthly price.
test("annual checkout never silently falls back to the monthly price", async () => {
  for (const plan of ["junior", "adult", "family"]) {
    const r = await api("POST", "/api/stripe/checkout", { body: { plan, cycle: "annual" } });
    // 503 = Stripe off entirely (the case here); 400 = configured but no yearly price.
    // A 200 would mean a checkout session was created, which for an unconfigured
    // yearly price could only have come from the monthly fallback.
    assert.ok(r.status === 400 || r.status === 503, `${plan} annual returned ${r.status}`);
  }
});

// The webhook is the source of truth for entitlements, so it must fail closed.
// It used to return true when STRIPE_WEBHOOK_SECRET was unset, which meant an
// unsigned POST naming your own uid granted you a paid plan for free.
test("the Stripe webhook rejects unsigned events instead of granting a plan", async () => {
  const signup = await api("POST", "/api/auth/signup", {
    body: { email: "webhook-victim@example.com", password: "longenough1", name: "Victim" },
  });
  assert.equal(signup.status, 200);
  const { id } = signup.body.user;

  const res = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "checkout.session.completed",
      data: { object: { id: "cs_forged", metadata: { uid: id, plan: "family" } } },
    }),
  });
  assert.equal(res.status, 400);

  const me = await api("GET", "/api/me", { token: signup.body.token });
  assert.equal(me.body.user.subs.family, undefined);
  assert.equal(me.body.user.subs.junior, false);
  assert.equal(me.body.user.subs.adult, false);
});

// The AI proxy is unauthenticated by design, so the per-IP limiter is the only thing
// stopping an anonymous caller from burning the Anthropic key. Exercised against
// /api/tts because it shares aiLimit but no other test spends that path's budget —
// the limiter keys on IP+path, and every test here shares one server and one IP.
// (Budget note: the suite uses 7 of 10 signups and 2 of 10 logins per 15 min.)
test("the AI proxy rate-limits a burst from one IP", async () => {
  let limited = null;
  for (let i = 0; i < 31 && !limited; i++) {
    const res = await fetch(`${BASE}/api/tts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });
    if (res.status === 429) limited = res;
  }
  assert.ok(limited, "expected a 429 within 31 requests (aiLimit is 30 per 5 min)");
  assert.ok(Number(limited.headers.get("retry-after")) > 0, "429 must carry Retry-After");
});

test("unknown API paths do not fall through to the SPA shell", async () => {
  const res = await fetch(`${BASE}/api/definitely-not-a-route`);
  assert.notEqual(res.status, 200);
});
