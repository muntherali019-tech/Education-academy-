# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

**Education Academy** ("A service for students and learners") — a cat-themed
learning game for UK learners, hosted by **Mochi the ginger cat**. It covers four
stages aligned to the UK system (Key Stage 1, 2, 3 and Higher Education) with
15-question puzzle rounds, AI homework photo-marking, a scan-and-solve helper, and
a subscription paywall with a daily free allowance.

The app is implemented and tested. `README.md` is the contributor-facing overview;
this file is the map for changing the code.

## Tech stack

- **React 19 + TypeScript on Vite 8.** ESM throughout (`"type": "module"`).
- **Vitest** (jsdom + Testing Library + jest-dom) for tests.
- **`@anthropic-ai/sdk`** for the two vision features, used **only** from `server/`.
- Plain CSS (`src/index.css`, `src/styles.css`). No CSS framework, no state library,
  no router — `App.tsx` switches screens from local state.
- **Node ≥ 22.22.2** (`^22.22.2 || ^24.15.0 || >=26.0.0`). The floor comes from
  `jsdom` 30, which bundles undici 8 and calls `worker_threads.markAsUncloneable`;
  Node 20 cannot run the suite. It's enforced by `engines`.
- No linter or formatter is configured.

## Commands

```bash
npm install            # install dependencies
npm run dev            # Vite dev server on http://localhost:5173 (also mounts /api/mark and /api/solve)
npm test               # vitest run — the whole suite (22 files, ~246 tests)
npm run test:watch     # vitest in watch mode
npm run typecheck      # tsc --noEmit
npm run test:coverage  # vitest run --coverage (enforces the floors in vite.config.ts)
npm run build          # tsc --noEmit && vite build          -> dist/
npm run build:server   # bundle server/serve.ts              -> dist-server/
npm start              # node dist-server/serve.js (what the deploy runs)
npm run preview        # Vite's own preview of dist/ (no API — use npm start for that)
```

Run one file or one test: `npx vitest run src/game/round.test.ts`,
`npx vitest run -t "scores a perfect round"`.

## Project structure

```
src/
  main.tsx              React entry point
  App.tsx               App shell: stage picker, round UI, dashboard, plans, camera features.
                        Renders the stage picker, quiz and results inline — there is no
                        separate components/ directory.
  game/                 Core rules — framework-free, no React imports, fully unit tested
    stages.ts           The four UK stages and age-to-stage mapping
    questions.ts        Question bank, filtered by stage
    round.ts            Round creation, answering, scoring (ROUND_SIZE = 15)
    random.ts           Seeded PRNG + shuffle, so rounds are reproducible
    progress.ts         Round history plus per-stage and per-subject summaries
    progressStorage.ts  Loads/saves that history, tolerating unreadable data
    subscription.ts     Plans, the daily free allowance, the access check
    subscriptionStorage.ts  Loads/saves the subscription and the allowance
    storage.ts          Shared, failure-tolerant JSON read/write over Web Storage
  photo/                Photo handling shared by both camera features
    photo.ts            Format and size checks, reading a chosen file
    photoClient.ts      Posting a photo to a vision endpoint
  marking/              AI homework photo-marking (browser half)
    marking.ts          Types, the JSON schema, result validation
    markingClient.ts    Posts the photo to the marking endpoint
    MarkingView.tsx     Photo picker and marked-up results
  solving/              Scan and solve (browser half)
    solving.ts          Types, the JSON schema, validation
    solvingClient.ts    Posts the photo to the solving endpoint
    SolveView.tsx       Photo picker and step-by-step walkthrough
  errors.ts             LearnerError / learnerMessage — the learner-safe error type
  test/setup.ts         Vitest setup (jest-dom matchers)
server/                 The vision endpoints + the production server (hold the API
                        key, never shipped to the browser)
render.yaml             One-service Render blueprint — the deploy path
```

Domain types live with the code that owns them (`game/stages.ts`, `game/questions.ts`,
`marking/marking.ts`, `solving/solving.ts`) rather than in a shared `types.ts`.

Unit tests live **beside** the code as `<name>.test.ts(x)`, not in a separate tree.

## Architecture

### The split that matters

Logic lives in `src/game`, `src/marking`, `src/photo` and `src/solving` as plain
modules with unit tests alongside; components stay presentational and `App.tsx`
wires them together. **Keep that split** — game rules must not import React, and
components should not grow rules of their own.

### The vision endpoints (`server/`)

The camera features call Claude, which needs an API key, and **the key must never
reach the browser**. So the browser posts the photo to an endpoint and `server/` is
what runs behind it:

```
browser  ──POST /api/mark──▶  handleMarkRequest   ──▶  createClaudeMarker  ──┐
(no key)  ──POST /api/solve─▶  handleSolveRequest  ──▶  createClaudeSolver ──┴─▶ Claude API
                               (validate the body)      (hold ANTHROPIC_API_KEY)
```

| File | What it is |
| --- | --- |
| `claudeVision.ts` | Shared request building and reply parsing for both features |
| `claudeMarker.ts` / `claudeSolver.ts` | The per-feature prompt and schema |
| `photoRequest.ts` | Body validation, rate limiting and failure handling shared by both handlers |
| `rateLimit.ts` | The sliding-window limiter |
| `photoLimits.ts` | The per-client and overall limits both endpoints share |
| `clientKey.ts` | Works out who to count a request against |
| `markHandler.ts` / `solveHandler.ts` | Transport-agnostic: parsed body in, `{ status, body }` out |
| `markingApiPlugin.ts` | Mounts both handlers on the **Vite dev server** |
| `httpApi.ts` | Mounts both handlers on a plain `node:http` server (production) |
| `serve.ts` | The production process: static files + the API. Bootstrap only |

There is **no Express server** and no framework — the two transports are a Vite
plugin in development and `node:http` in production, sharing the same handlers.
`server/README.md` documents the full request/response contract, the status codes,
the rate-limit defaults and how to mount the handlers somewhere else (a serverless
function, an edge worker) — read it before changing anything under `server/`.

**The two transports must stay in step.** `markingApiPlugin.ts` and `httpApi.ts`
both do method checks, the 501-without-a-key check, body reading with an 8 MB cap,
JSON parsing and `clientKey` derivation before delegating. A change to that
sequence belongs in both, or dev and production drift apart.

**Keep `serve.ts` a bootstrap.** It is the one file excluded from coverage (like
`src/main.tsx`), so logic added there is untested by construction. Request handling
belongs in `httpApi.ts`, which is covered.

Without `ANTHROPIC_API_KEY` the endpoints answer **501** and the app says the
feature isn't switched on. Everything else still works, and the test suite never
needs a key.

Model: `claude-opus-5`, one request per photo, `effort: "medium"`, capped by
`VISION_MAX_TOKENS`. Both replies are constrained with structured outputs
(`output_config.format`) against the schemas in `src/marking/marking.ts` and
`src/solving/solving.ts`, so the browser receives JSON in a known shape rather than
prose to parse.

### Rate limiting

Every photo is a paid API call, so both endpoints are limited **before** any work is
done. Defaults: 20 photos per client per hour (`PHOTO_RATE_LIMIT_PER_CLIENT`) and
120 overall per hour (`PHOTO_RATE_LIMIT_TOTAL`). Create the limiters **once, at
startup** — building them per request gives every request a fresh allowance, which
is the same as having no limit. The overall limit is the one that actually caps
spend; treat the per-client limit as politeness. Counts are per process and in
memory, so they reset on restart and don't add up across instances.

## Conventions

- **TypeScript everywhere, strict.** `npm run typecheck` (and `npm run build`) must
  pass; `tsc --noEmit` runs before every build.
- **Test beside the code.** A new module in `game/`, `marking/`, `photo/` or
  `solving/` gets a `<name>.test.ts` next to it in the same change.
- **Errors reaching a learner go through `LearnerError`/`learnerMessage`**
  (`src/errors.ts`). Anything else is replaced with a general message, so nothing
  about the API, the key or the transport leaks into the UI. `claudeMarker.test.ts`
  and `claudeSolver.test.ts` pin that behaviour — don't loosen it.
- **Storage is failure-tolerant.** Everything persisted goes through
  `src/game/storage.ts`, which takes a `WebStorageLike` (easy to fake in tests) and
  tolerates blocked or corrupt storage rather than throwing.
- **An unreadable photo is not an error.** `/api/solve` answers 200 with an empty
  `problem` and no steps; `/api/mark` with an empty `items` list. The model is told
  to do that rather than guess, and the UI says so.
- **Keep secrets out of the repo.** Never commit API keys. `ANTHROPIC_API_KEY` is
  read by `server/` only; there is no `VITE_`-prefixed secret. `VITE_MARKING_ENDPOINT`
  and `VITE_SOLVE_ENDPOINT` (both public) point the browser at the endpoints when
  they aren't served from `/api/mark` and `/api/solve` on the same origin. Keep
  `.env.example` current.
- **Mind learner data.** This app targets children and schools (UK). Be conservative
  with personal data, and flag anything with privacy/safeguarding implications rather
  than guessing.
- **Keep the cat/Mochi theming consistent** in user-facing copy.

## Coverage

`vite.config.ts` holds the Vitest config (there is no separate `vitest.config.ts`).
Coverage includes `src/**/*.{ts,tsx}` and `server/**/*.ts`, excluding `src/main.tsx`
and `src/test/**`. The thresholds are **floors set just under current coverage**, so
a regression fails the run: statements 93, branches 90, functions 95, lines 93.
Raise them as coverage grows; don't lower them to make a change pass.

Note the `include` is scoped to source extensions on purpose — a bare `src/**` also
matches `styles.css` and `server/README.md`, which the coverage provider then fails
to parse as JS.

## Deploying

`render.yaml` is a one-service Render blueprint: it builds the browser bundle and
the server bundle, then runs `node dist-server/serve.js`, which serves `dist/` and
mounts `/api/mark` and `/api/solve` on the same origin. Set `ANTHROPIC_API_KEY` in
the dashboard to switch the camera features on — without it the app still runs and
those two endpoints answer 501.

`TRUST_PROXY=1` is set in the blueprint because Render terminates TLS and overwrites
`x-forwarded-for`. **Leave it unset anywhere a client can reach the process
directly**, or a caller can spoof the header and mint a fresh rate allowance per
request.

To host the API somewhere else instead, mount `handleMarkRequest`/`handleSolveRequest`
there (see `server/README.md`) and point the browser at it with
`VITE_MARKING_ENDPOINT` / `VITE_SOLVE_ENDPOINT`.

## CI

`.github/workflows/ci.yml` runs on push to `main` and on pull requests, against a
Node **22 and 24** matrix: `npm ci` → `npm run typecheck` → `npm run test:coverage`
(enforcing the floors above) → `npx vite build` → `npm run build:server` → a smoke
test that boots the production server and checks the app shell, a 501 from
`/api/mark` and a JSON 404 from an unknown `/api/` path. Superseded runs on the same
branch are cancelled. Match it locally before pushing.

## Product backlog

From `README.md` — treat this as the scope to map new work onto:

- Four learning stages (KS1, KS2, KS3, Higher Education) ✅
- 15-question puzzle rounds as the core loop ✅
- AI homework photo-marking ✅
- Scan-and-solve helper ✅
- Subscription paywall ✅
- Parent/teacher dashboard with progress tracking — partially built; `App.tsx` shows
  stage/subject summaries, but there is no separate parent view yet.

## Git workflow

- The default branch is `main`.
- Do work on feature branches, not directly on `main`; push with
  `git push -u origin <branch>` and retry network failures with exponential backoff.
- Use clear, descriptive commit messages.
- **Do not open a pull request unless explicitly asked.**
- If a designated branch's PR has already merged, restart the branch from the latest
  `main` for follow-up work rather than stacking onto merged history.

## Keeping this file current

This document is only useful if it reflects reality. Whenever you change the stack,
tooling, directory structure or a convention, update the relevant section above in
the same change.
