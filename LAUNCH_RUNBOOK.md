# Education Academy — Launch Runbook

The operational plan for taking the app live on Google Play. `DEPLOYMENT.md` is *how to build/configure*; this is *how to launch and run it*. Fill in the owners and dates.

| Role | Owner |
|---|---|
| Release lead | |
| Backend / on-call | |
| Support inbox | |

---

## 1. Go / No-Go gates (all must be ✅ before production rollout)
**Product & infra**
- [ ] Backend deployed; `/api/health` green; `VITE_API_BASE` points to it
- [ ] AI works in prod (homework marking, scan & solve, language lessons, goal suggestions)
- [ ] Dev JSON store + HMAC auth **replaced** with managed DB/auth (or accepted risk, documented)
- [ ] Cross-device sync verified on two devices

**Money**
- [ ] Billing sandbox-tested end-to-end (see `BILLING_SANDBOX_TESTING.md`)
- [ ] `VITE_BILLING=revenuecat`; mock OFF; prices correct in store

**Compliance (kids)**
- [ ] Target audience = children; Families policy requirements met
- [ ] Data safety form complete & accurate (incl. premium voice / mic if enabled)
- [ ] Content rating (IARC) submitted
- [ ] Ads = none
- [ ] Privacy policy live at `VITE_PRIVACY_URL`; deletion request page live
- [ ] Parental gates present: purchases, photos, microphone

**Quality & accessibility**
- [ ] Smoke test on ≥2 physical Android devices (low-end + recent)
- [ ] Screen-reader pass (TalkBack): can navigate, hear questions, get feedback
- [ ] "Read aloud" + Mochi voice work; mic speaking practice works or degrades gracefully
- [ ] No crashes in a 15-minute exploratory test

**Support**
- [ ] Support email live and monitored; auto-reply set
- [ ] Store listing assets final (icon, feature graphic, screenshots, description)

> If any gate is red, do not promote to production. Fix or explicitly accept the risk with the release lead.

---

## 2. Timeline
**T‑2 weeks**
- [ ] Internal testing build; run the full sandbox billing matrix
- [ ] Finalise listing copy & assets; draft privacy policy → legal review

**T‑1 week**
- [ ] Closed testing with 5–20 real parents/teachers; collect feedback; fix top issues
- [ ] Confirm all Go/No-Go gates trending green

**Launch day**
1. [ ] Final Go/No-Go review — all gates ✅
2. [ ] Promote the tested build to **Production** with a **staged rollout at ~10–20%**
3. [ ] Once live, install from the public listing and **make one real purchase**, then refund it from Play
4. [ ] Verify listing renders correctly (screenshots, price, "no ads", privacy link)
5. [ ] Announce (website CTA live, link the Play page)

**T+24–72 hours**
- [ ] Watch dashboards (below); if healthy, increase rollout 20% → 50% → 100%
- [ ] Triage reviews and support; ship a fast patch if needed

---

## 3. What to monitor
- **Play Console → Vitals**: crash rate & ANRs (target crash-free > ~99%)
- **Backend**: uptime, `/api/health`, error rate/latency, AI proxy failures
- **RevenueCat**: purchases, conversion, refunds, active subscriptions, failed renewals
- **Ratings & reviews**: respond quickly, especially 1–2★
- **Support inbox**: response time; recurring themes
- **AI cost**: Anthropic (and ElevenLabs, if premium voice) usage vs expectation

---

## 4. Incident response & rollback
**If crashes/critical bug after rollout**
1. Play Console → **halt the staged rollout** immediately
2. Roll back by promoting the **previous known-good .aab**, or ship a hotfix build
3. If it's backend-side, fix forward (the app degrades: AI features show friendly errors, core play still works offline)
4. Feature kill-switches via env + rebuild: `VITE_BILLING=mock` (stop charges), `VITE_TTS=device` (disable premium voice), point `VITE_API_BASE` to a healthy backend

**If a billing problem**
- Halt rollout; verify RevenueCat/Play product config; never ship an unlock that bypasses Play Billing
- For affected users, use Play/RevenueCat to grant or refund

**If a privacy/compliance issue**
- Treat as P0: pause rollout, assess data exposure, correct, and update the Data safety form / privacy policy before resuming

**Comms**: note the issue, who's on it, and ETA in your channel; reply to affected reviews/emails once fixed.

---

## 5. Support quick answers
- **"I paid but it's locked"** → Plans → **Restore purchases**; confirm same Google account; check entitlement in RevenueCat
- **"AI isn't working"** → needs internet; check backend health; API key set server-side
- **"Mochi has no voice"** → device TTS/voice installed? on iOS the first line needs a tap; check the voice toggle/Settings
- **"Speaking practice won't listen"** → unsupported browser (Firefox/older iOS) → use hear-and-repeat; check mic permission
- **"How do I cancel?"** → via Google Play subscriptions; access lasts until period end
- **"Delete my data"** → portal → Delete my account & data, or email the deletion address

> **Ops — preview/resend a parent's report:** `GET /api/admin/report?email=<parent>&format=html` (preview in a browser) or `POST /api/admin/report?email=<parent>` (send now). Both require the `x-admin-secret` header matching `ADMIN_SECRET`.

---

## 6. KPIs (first 30 days)
- Installs, store conversion rate
- Activation: % who complete a first round / first lesson
- Trial→paid conversion; churn; active subscriptions
- D1 / D7 / D30 retention
- Crash-free users %, average rating
- Support tickets per 100 installs

---

## 7. Post-launch backlog (engagement)
- [x] Emailable parent progress reports (in the portal: Email/Copy)
- [x] **Scheduled weekly emails** — opt-in toggle per parent; backend runner + `POST /api/cron/weekly-reports`. Set `EMAIL_PROVIDER` (+ key), point a daily scheduler at the endpoint with `x-cron-secret`, or set `WEEKLY_EMAILS_INPROCESS=1`.
- [x] **Play In-App Review** — gentle prompt to the grown-up after a positive report (rate-limited), plus a manual "Rate" in Settings. Needs `@capacitor-community/in-app-review` installed for the native dialog.
- [ ] More language content (listening/speaking already in); seasonal/topic packs
- [ ] Migrate auth/data to a managed provider if not already; add rate limiting & monitoring/alerts
