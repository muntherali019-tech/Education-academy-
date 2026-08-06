# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

**Education Academy** (internal package name `whisker-academy`) — a cat-themed
learning game for UK learners, hosted by **Mochi** the ginger cat. It covers four
stages (Key Stage 1, 2, 3 and Higher Education) with AI-generated quiz rounds,
homework photo-marking, a scan-and-solve helper, an AI language teacher, vocational
exam-prep courses, subscriptions, and a parent/teacher portal.

The user-facing README is aimed at people shipping the app; this file is the
orientation map for changing the code.

This repo is **the single home for the product**. It previously held a smaller
React 19 + TypeScript prototype covering only the quiz/marking/solve/subscription
slice; that was replaced by the mature, live codebase documented here (which used
to live in the `Higher-education-` repo, alongside a near-identical fork in
`relic-run`). Both of those are retired — do not port code back from them.

Reelmint (an AI content studio) was also once embedded here in `reelmint/`; it has
its own repository. Nothing here depends on it.

## Tech stack

- **Frontend:** React 18 + Vite 5, plain JavaScript (JSX, **no TypeScript**), ESM
  everywhere (`"type": "module"`). Icons from `lucide-react`. Styling is a single
  hand-written `src/styles.css` using CSS custom properties (e.g. `var(--ginger)`);
  there is no CSS framework or CSS-in-JS.
- **Backend:** a small **Express** server (`server/index.js`) that proxies the
  Anthropic API (keeping the key server-side), plus accounts, cross-device sync,
  classes, goals, weekly emails and Stripe payments.
- **Mobile:** **Capacitor** wraps the web build into an Android app.
- **Data:** a JSON file store by default, optionally Postgres (`server/store.js`).
- **State (client):** React hooks + `localStorage` (keys prefixed `whisker.`).

Tests use **Node's built-in `node:test`** runner (`npm test`) — no Jest/Vitest and no
extra test dependencies. There is still **no linter/formatter** configured. Anything
the suite doesn't cover (the React UI in particular) is verified by running the dev
server and exercising the flow by hand, plus `node --check` on server files.

## Common commands

```bash
npm install            # install deps (the SessionStart hook does this automatically on web)

npm start              # run web app (Vite :5173) + API (Express :8787) together
npm run dev            # web front-end only (mode web), instant "mock" unlock for testing
npm run dev:app        # front-end in app mode
npm run server         # Express API only, on :8787
npm test               # node:test — the full suite (run this before committing)

npm run build          # == build:web  -> dist-web/
npm run build:web      # website build (Stripe payments)          -> dist-web/
npm run build:app      # mobile build  (Play Billing/RevenueCat)  -> dist-app/
npm run build:onefile  # one self-contained index.html            -> dist-onefile/
npm run preview        # serve the built dist-web/

npm run cap:sync       # build:app + copy assets into the android/ project
npm run cap:open       # open Android Studio
```

`npm test` runs four suites in `test/` (no keys or network needed — it boots the real
server in a temp directory with the AI/Stripe keys stripped):

| Suite | Covers |
|---|---|
| `server.test.js` | the API over real HTTP: auth, child access control, goal scoping, classes/leaderboard, cascade deletes, the keyless AI proxy, checkout rejection, the fail-closed Stripe webhook, per-IP rate limiting |
| `plans.test.js` | the `PLANS` catalog, `planForKs` and `grantPlan` entitlement rules |
| `progress.test.js` | `src/lib/progress.js` — stars, streaks, freezes, rounds, daily goal |
| `bank.test.js` | offline bank integrity: every stage/subject has a full, well-formed, non-repeating round |

To sanity-check the server without a browser: `node --check server/index.js` and hit
`GET /api/health`.

## Architecture

```
Browser (React)  ──POST /api/claude──►  Express server  ──x-api-key──►  Anthropic API
   src/App.jsx                          server/index.js
```

The **Anthropic API key never reaches the browser.** All AI calls go through
`src/lib/api.js`, which POSTs to the backend (`/api/claude`), which forwards to
Anthropic with the server-side key.

**Model tiers.** The client picks the best model per task via `MODELS` in
`src/lib/api.js`: `REASONING` (`claude-opus-4-8`) for homework marking and
scan-and-solve, `SMART` (`claude-sonnet-5`, the default) for question/lesson/exam
generation and tutor chat, and `FAST` (`claude-haiku-4-5`) for tiny
routing/translation calls. The server (`server/index.js`) enforces an
**allow-list** (`ALLOWED_MODELS`) and falls back to `DEFAULT_MODEL`
(`ANTHROPIC_MODEL` env, default `claude-sonnet-5`) — so change model choices in
those two places, never hard-code an id elsewhere.

`src/lib/api.js` reads `import.meta.env.VITE_API_BASE` (falling back to `/api`),
so a production mobile build points at a deployed backend URL. In dev, Vite proxies
`/api` → `http://localhost:8787` (see `vite.config.js`).

### Three builds from one codebase

Selected by Vite `--mode`, which loads the matching `.env.<mode>` file and sets
`VITE_PLATFORM` / `VITE_BILLING`:

| Build | Command | Output | Platform helper | Payments |
|---|---|---|---|---|
| Web (website) | `build:web` | `dist-web/` | `isWeb()` | Stripe Checkout |
| Mobile (Google Play) | `build:app` | `dist-app/` | `isApp()` | Play Billing via RevenueCat |
| Single file | `build:onefile` | `dist-onefile/` | `isWeb()` | mock (demo) |

`src/lib/platform.js` exposes `isApp()`/`isWeb()`; `src/lib/billing.js` picks the
payment provider from the build (Stripe for web, RevenueCat for app) and falls back
to an instant **mock** unlock in dev. In dev, `VITE_BILLING` defaults to mock; a
production build uses the real provider unless you force `VITE_BILLING=mock`.

## Directory layout

```
src/
  main.jsx                 React entry (wraps <App/> in <ErrorBoundary/>)
  App.jsx                  the whole app shell — screen router, quiz flow, all top-level state (~1300 lines)
  styles.css               all styling (CSS custom properties, no framework)
  components/
    Mochi.jsx              the animated cat mascot
    Calculator.jsx         in-app calculator helper
    Courses.jsx            vocational exam-prep courses screen
    Languages.jsx          AI language-teacher screen (lessons, quiz, listening, speaking)
    GrownUps.jsx           parent/teacher portal (auth, children, classes, goals, reports)
    Worksheet.jsx          printable AI worksheet generator (premium revenue tool)
    Gift.jsx               gift-a-subscription screen (buy → redeemable code)
    ErrorBoundary.jsx      top-level crash guard -> friendly recoverable screen
  data/                    static content (no logic)
    curriculum.js          stages, subjects, topics, PLANS (incl. Family), grantPlan(), per-stage tutor prompts (tutorBrief)
    bank.js                offline fallback quiz questions
    courses.js             vocational course + module definitions
    languages.js           taught languages (BCP-47 codes, rtl flag) + fallback phrases
    demo.js                realistic sample learner + curated sample round for the live demo (not lorem)
  lib/                     client logic, one concern per file
    api.js                 ALL Anthropic calls + MODELS tiers (generateQuestions, markHomework, solveQuestion, askTutor, generateWorksheet, ...)
    progress.js            localStorage state, stats, streaks, daily goal (state key "whisker.v1")
    billing.js             purchases + gift codes (Stripe / RevenueCat / mock)
    printable.js           self-contained printable certificate + worksheet (hidden-iframe print)
    platform.js            web-vs-app build detection
    cloud.js               cross-device sync against the backend
    i18n.js                whole-app localisation (batched AI translation, cached on device)
    speech.js              text-to-speech (device voice or premium /api/tts)
    recognition.js         speech-to-text (Web Speech API)
    achievements.js, motivation.js, coach.js, celebrate.js, review.js,
    reminders.js, trial.js, mochiShop.js, examCache.js, share.js   small feature helpers

server/
  index.js                 Express app: /api/claude proxy, /api/tts, auth, children/sync,
                           goals, classes, leaderboard/referrals, weekly emails, Stripe
  store.js                 data layer — load()/save() over a JSON file OR Postgres (DATABASE_URL)
  auth.js                  password hashing + signed token helpers
  email.js                 weekly-email sending (console / Resend / SendGrid)

marketing/                 static legal + marketing pages (privacy, terms, support, status) served at clean URLs
public/                    favicon, PWA manifest, app icons
resources/                 store assets (icons, splash, feature graphic)
```

## Key conventions

- **JavaScript + ESM only.** No TypeScript, no build-time type checking. Use
  `import`/`export`, not CommonJS.
- **Code style is terse and dense.** Many handlers and helpers are one-liners;
  match the surrounding density rather than expanding everything out. Prefer small
  pure helpers. Match existing comment style — short `//` notes explaining *why*,
  and `/* ---------- section ---------- */` banners in the server.
- **React:** function components with hooks only. `App.jsx` holds nearly all
  top-level state and acts as a screen router via a `screen` string state; feature
  screens are components under `src/components/`. There is no router library and no
  global state manager.
- **State persistence:** client progress lives in `localStorage` under keys prefixed
  `whisker.` (main state is `whisker.v1`, see `src/lib/progress.js`). `defaultState()`
  is the schema of record; `loadState()` merges saved data over it so new fields are
  backward-compatible — add new state fields there.
- **AI prompts live in two places:** `tutorBrief(ks, subject)` in
  `src/data/curriculum.js` gives each stage its tutor "voice"; the request-specific
  system prompts are in `src/lib/api.js`. Most AI functions ask for **raw JSON** and
  parse it with `extractJSON()` (tolerant of markdown fences) — keep that contract if
  you add new ones.
- **Localisation:** user-visible strings are wrapped with `t()`/`useT()` and must be
  registered in the `STRINGS` array in `src/lib/i18n.js` to be translated. AI-generated
  content (quizzes, feedback, lessons) is generated directly in the chosen language via
  a `language` argument to the `api.js` functions.
- **Secrets stay server-side.** Never put the Anthropic, ElevenLabs or Stripe secret
  keys in frontend code or `VITE_*` vars. `VITE_*` values are public (baked into the
  bundle); everything else is read by the server from the environment.
- **Backend data access** goes only through `load()`/`save()` in `server/store.js`,
  which transparently uses either the JSON file or Postgres. The whole dataset is one
  in-memory object (`{ users, children, classes, goals }`); route handlers mutate it
  and call `save(db)`.
- **Auth pattern:** wrap protected routes in the `auth(handler)` helper in
  `server/index.js`; it resolves the bearer token to a user and 401s otherwise.
  `pub(user)` is the only shape sent to the client (never leak `salt`/`hash`).
- **Rate limiting.** The paid AI/TTS proxies and the auth endpoints go through the
  hand-rolled per-IP limiter (`aiLimit` = 30 per 5 min, `authLimit` = 10 per 15 min).
  `/api/claude` is unauthenticated by design, so this is the only thing standing
  between an anonymous caller and the Anthropic bill — keep new AI-backed or
  credential-checking routes behind one of these. Buckets are keyed on IP+path and
  held in memory; set `TRUST_PROXY=1` behind Render/nginx or every visitor shares
  the proxy's IP. Multi-instance deploys need a shared store instead.
- **The Stripe webhook fails closed.** `verifyStripeSig` returns false when
  `STRIPE_WEBHOOK_SECRET` is unset (it used to return *true*, so any unsigned POST
  was processed — enough to grant yourself a plan by naming your own uid), and
  rejects signatures outside `STRIPE_WEBHOOK_TOLERANCE` (default 300s).
  `server.test.js` asserts this; don't relax it for local convenience.

## Monetisation & premium features

Revenue paths, all built on the existing billing/Stripe plumbing:

- **Plans** live in `PLANS` (`src/data/curriculum.js`): **Junior** (£3, KS1–2),
  **Adult** (£5, KS3 & HE), and **Family** (£8, everything for up to 4 learners).
  Family is a bundle — `grantPlan(subs, "family")` also sets `junior` + `adult`,
  and the server's `setUserPlan`/`planFromSubscription` mirror that. Add a new
  tier by extending `PLANS`, `billing.js` (`PRODUCT_IDS`/`ENTITLEMENTS`), the
  Stripe price map, and `grantPlan`.
- **Gift subscriptions** (`src/components/Gift.jsx`, `billing.giftCheckout`/
  `redeemGift`): in dev/mock, `/api/gift/mock-create` mints a code instantly — and
  is **disabled once `STRIPE_SECRET_KEY` is set** so it can't mint free plans in
  production. The web build runs a one-time Stripe Checkout (`/api/gift/checkout`)
  and the webhook mints a `GIFT-XXXX` code stored in `db.gifts`. Codes are redeemed
  in Settings (`/api/gift/redeem`), which grants the plan for 30 days; `enforceGiftExpiry`
  (in the `auth()` wrapper) revokes gifted access after the window unless a Stripe
  subscription backs the account.
- **Printable certificates & worksheets** (`src/lib/printable.js`,
  `src/components/Worksheet.jsx`): self-contained print/PDF via a hidden iframe —
  no layout coupling. Worksheets are AI-generated (`api.generateWorksheet`) and
  deep-link from each "needs practice" topic on the dashboard.
- **Live demo** (`src/data/demo.js`): `demoState()` fills the dashboard with a
  believable sample learner (loads only when empty, cleared by "Reset progress");
  `DEMO_ROUND` is a curated, offline "try a free sample round" on the home screen.

When adding a paid surface, gate it on `state.subs[...]`/`trial.trialActive()`,
keep the Stripe/Play split in `billing.js`, and never trust the client for
entitlement — the server webhook is the source of truth.

## Configuration & environment

- Copy `.env.example` to `.env` for local dev. The key variables:
  - `ANTHROPIC_API_KEY` (required for AI features), `PORT` (default 8787).
  - `AUTH_SECRET` — signs auth tokens; set a long random value in production.
  - `ELEVENLABS_*` — optional premium cloud voice.
  - `STRIPE_*` + `PUBLIC_WEB_URL` — web-build payments.
  - `EMAIL_PROVIDER` / `RESEND_API_KEY` / `SENDGRID_API_KEY`, `CRON_SECRET`,
    `WEEKLY_EMAILS_INPROCESS`, `ADMIN_SECRET` — weekly parent-email digests.
  - `DATABASE_URL` — switch the store to Postgres (then `npm install pg`).
  - Build-time `VITE_*` flags (`VITE_API_BASE`, `VITE_BILLING`, `VITE_PLATFORM`,
    `VITE_PRIVACY_URL`, …) are usually set via `.env.web` / `.env.app` / `.env.onefile`.
- `render.yaml` deploys the website as **one** Render service (builds `dist-web`,
  serves it together with the API). Secrets are set in the Render dashboard.
- `capacitor.config.json` configures the Android app (`com.educationacademy.app`).
- `.claude/hooks/session-start.sh` runs `npm install` on Claude Code web sessions
  so the dev server/build/API are ready immediately (only in the remote environment).

Deeper operational docs live in the repo root: `DEPLOYMENT.md` (Play Store),
`DEPLOY_WEBSITE.md` (website + API), `PRICING.md`, `COMPLIANCE.md`, `VERIFY.md`,
`LAUNCH_RUNBOOK.md`, `CHECKLIST.md`.

## CI

`.github/workflows/main-ci.yml` ("Main App CI") is the only workflow in this repo:
`npm ci` → audit runtime deps (fails on high/critical) → full audit (report only) →
`npm test` → `node --check` on the server → build web/app/onefile → API smoke test in
demo mode. Match it locally before pushing: tests green, audit clean, all three builds
succeeding.

## Working here — quick checklist

- Adding an AI feature? Put the client function in `src/lib/api.js` (raw-JSON +
  `extractJSON` contract), reuse `tutorBrief` for stage voice, and pass a `language`
  argument. The server proxy already handles it — no server change needed unless you
  need a new endpoint.
- Adding UI text? Wrap it in `t()` and register the English string in
  `src/lib/i18n.js`'s `STRINGS`.
- Adding client state? Extend `defaultState()` in `src/lib/progress.js`.
- Adding a backend route? Use `auth(...)` for protected routes, go through
  `load()`/`save()`, and never return raw user records — shape them like `pub()`.
- Adding a question to the offline bank? `bank.test.js` enforces the invariants —
  4 distinct non-empty choices, an in-range `answerIndex`, an explanation, no repeated
  question text, and at least a full round (15) per stage/subject.
- Run `npm test` before committing, and add a test alongside any new route or logic.
- Verify UI changes by running `npm start` and clicking through the affected flow; run
  `node --check server/index.js` after server edits.
- Keep the Anthropic/Stripe/ElevenLabs secrets server-side.
