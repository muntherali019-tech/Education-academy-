import test from "node:test";
import assert from "node:assert/strict";
import { PLANS, KS_META, planForKs, grantPlan } from "../src/data/curriculum.js";

// PLANS is the single source of truth for what can be bought, and grantPlan is
// the entitlement rule every access check depends on — worth pinning precisely.
// The server mirrors grantPlan in setUserPlan() (server/index.js); if the Family
// bundling rule below ever changes, that mirror has to change with it.

test("catalog contains the junior, adult and family plans", () => {
  for (const id of ["junior", "adult", "family"]) {
    assert.ok(PLANS[id], `missing ${id}`);
  }
});

test("each plan declares a name, price, coverage and features", () => {
  for (const [id, p] of Object.entries(PLANS)) {
    assert.ok(p.name, `${id} needs a name`);
    assert.match(p.price, /^£\d+$/, `${id} price should look like "£3"`);
    assert.ok(p.covers, `${id} needs a coverage line`);
    assert.ok(Array.isArray(p.features) && p.features.length > 0, `${id} needs features`);
    assert.ok(p.color, `${id} needs a colour token`);
  }
});

test("exactly one plan is highlighted as the best value", () => {
  const best = Object.entries(PLANS).filter(([, p]) => p.best).map(([id]) => id);
  assert.deepEqual(best, ["family"], "Family is the highlighted bundle");
});

test("planForKs maps every stage to a real plan", () => {
  assert.equal(planForKs("ks1"), "junior");
  assert.equal(planForKs("ks2"), "junior");
  assert.equal(planForKs("ks3"), "adult");
  assert.equal(planForKs("he"), "adult");
  // Every stage in KS_META must resolve to a plan that actually exists.
  for (const ks of KS_META) {
    assert.ok(PLANS[ks.plan], `${ks.id} points at unknown plan "${ks.plan}"`);
  }
});

test("planForKs returns nothing for an unknown stage", () => {
  assert.equal(planForKs("nope"), undefined);
});

test("grantPlan unlocks exactly the track that was bought", () => {
  assert.deepEqual(grantPlan({ junior: false, adult: false }, "junior"), { junior: true, adult: false });
  assert.deepEqual(grantPlan({ junior: false, adult: false }, "adult"), { junior: false, adult: true });
});

test("Family bundles both Junior and Adult access", () => {
  const subs = grantPlan({ junior: false, adult: false }, "family");
  assert.equal(subs.family, true);
  assert.equal(subs.junior, true, "Family must unlock Junior");
  assert.equal(subs.adult, true, "Family must unlock Adult");
});

test("grantPlan never revokes an existing subscription", () => {
  const subs = grantPlan({ junior: true, adult: false }, "adult");
  assert.equal(subs.junior, true, "buying Adult must not drop Junior");
  assert.equal(subs.adult, true);
});

test("grantPlan does not mutate the state it is given", () => {
  const before = { junior: false, adult: false };
  grantPlan(before, "family");
  assert.deepEqual(before, { junior: false, adult: false }, "grantPlan must return a new object");
});

test("grantPlan tolerates being called with no prior state", () => {
  assert.equal(grantPlan(undefined, "family").adult, true);
});
