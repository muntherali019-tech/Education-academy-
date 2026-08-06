# Billing Sandbox Test Checklist (Google Play + RevenueCat)

Use this to verify real purchases **before** going live. You can't take real money or test this from a normal `npm start` web build — Google Play Billing only works in a **signed app installed from a Play testing track** by a **licensed tester**.

## 0. Prerequisites
- [ ] `npm install @revenuecat/purchases-capacitor` then `npx cap sync`
- [ ] Subscriptions created & **Active** in Play Console: `whisker_junior_monthly` (£3) and `whisker_adult_monthly` (£5)
- [ ] RevenueCat project created; Play credentials connected; products mapped to entitlements named **`junior`** and **`adult`**; they sit in the **current** Offering
- [ ] Built with `VITE_BILLING=revenuecat` and `VITE_REVENUECAT_KEY=<public key>`
- [ ] Backend deployed and reachable (`/api/health` returns ok); `VITE_API_BASE` set
- [ ] Signed **.aab** uploaded to **Internal testing**

## 1. Set up testers
- [ ] Play Console → **Setup → License testing**: add the tester Google account(s)
- [ ] Add the same account(s) to the **Internal testing** track testers list
- [ ] On the test device, sign in to the Play Store with that account, open the opt-in link, install from Play

## 2. Core purchase tests
- [ ] App launches; **Plans** screen shows both plans with correct prices pulled from the store
- [ ] Tapping **Subscribe** shows the **grown-up gate** first (multiplication) — purchase only proceeds after it passes
- [ ] Buy **Junior** → Play sandbox sheet appears → completes → **KS1 & KS2 unlock**, KS3/HE still locked
- [ ] Buy **Adult** → **KS3 & Higher Education unlock**
- [ ] RevenueCat dashboard shows the transaction and the active entitlement for the tester
- [ ] Force-close & reopen → entitlements still active (app refreshes them on launch)

## 3. Restore & multi-device
- [ ] Uninstall & reinstall → tap **Restore purchases** on Plans → entitlements come back
- [ ] Sign in on a second device with the same Google account → **Restore** → access granted

## 4. Lifecycle tests (sandbox renewals are accelerated)
- [ ] Cancel from Play subscriptions → access remains until period end, then locks
- [ ] Let a test renewal occur → access continues
- [ ] Trigger a billing problem (test card) → app handles gracefully (no crash; stays locked/limited)
- [ ] Upgrade/downgrade between Junior and Adult behaves sensibly

## 5. Edge & safety
- [ ] Airplane mode during purchase → friendly error, no crash, no false unlock
- [ ] Cancel the Play sheet mid-purchase → returns cleanly, nothing unlocked
- [ ] Refund/revoke from Play (or RevenueCat) → entitlement is removed on next launch/refresh
- [ ] Parental gate cannot be bypassed by a child (it gates every purchase attempt)

## Common gotchas
- Products show as "unavailable": they must be **Active**, priced, and in the **current** RevenueCat Offering; new products can take time to propagate.
- Tester sees real price but purchase fails: confirm the account is a **license tester** and installed **from the track link**.
- Entitlement not unlocking: the RevenueCat entitlement IDs must exactly equal **`junior`** / **`adult`** (see `ENTITLEMENTS` in `src/lib/billing.js`).
- Clear **Play Store** app cache / re-open if the sandbox sheet misbehaves.

## Sign-off
- [ ] All sections above pass on at least one physical Android device
- [ ] `VITE_BILLING=revenuecat` in the build you promote (mock is OFF)
- [ ] Screenshots of a successful purchase + restore saved for your records
