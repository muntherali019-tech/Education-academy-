# Education-academy-

A service for students and learners.

A cat-themed learning game for UK learners, hosted by Mochi the ginger cat. Covers four stages — Key Stage 1, Key Stage 2, Key Stage 3, and Higher Education — with 15-question puzzle rounds, AI homework photo-marking, a scan-and-solve helper, a subscription paywall, and a parent/teacher dashboard with progress tracking.

## Getting started

Requires Node.js 22.22.2+ (developed on Node 22). The floor comes from `jsdom`,
which the test suite runs in; it is enforced by `engines` in `package.json`.

```bash
npm install     # install dependencies
npm run dev     # start the dev server on http://localhost:5173
npm test        # run the test suite once
npm run build   # typecheck and build for production
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run test:watch` | Re-run tests on change |
| `npm run typecheck` | TypeScript check with no emit |
| `npm run preview` | Serve the production build locally |

## Project layout

```
src/
  game/                 Stage, question, round and progress logic (framework-free, fully unit tested)
    stages.ts           The four UK stages and age-to-stage mapping
    questions.ts        Question bank, filtered by stage
    round.ts            Round creation, answering and scoring
    random.ts           Seeded PRNG + shuffle, so rounds are reproducible
    progress.ts         Round history plus per-stage and per-subject summaries
    progressStorage.ts  Loads and saves that history, tolerating unreadable data
    subscription.ts     Plans, the daily free allowance and the access check
    subscriptionStorage.ts  Loads and saves the subscription and the allowance
    storage.ts          Shared, failure-tolerant JSON read/write over Web Storage
  test/setup.ts         Vitest setup (jest-dom matchers)
  App.tsx               Stage picker, round UI, dashboard and plans
  main.tsx              React entry point
```

The game rules live in `src/game/` with no React imports, so they can be tested
directly and reused later by the dashboard and marking features.

### Current status

Implemented so far: stage selection and 15-question puzzle rounds with seeded,
reproducible question order and scoring against a 60% pass mark, plus the
parent/teacher dashboard and the subscription paywall described below.

Still to build: AI homework photo-marking and the scan-and-solve helper.

### Parent and teacher dashboard

Finishing a round records it against its stage; quitting part way through does
not count. The dashboard — reachable from the stage picker — shows rounds
played, rounds passed, best and average scores and the last play date for each
stage, and rolls the answers up by subject so it is obvious where help is
needed.

The history is kept in `localStorage` under `education-academy:progress:v1`, so
it is per-device and per-browser, with no account and nothing sent anywhere. The
last 200 rounds are kept. A history that cannot be read — blocked storage, data
from an older build — is treated as a fresh start rather than an error, and
"Clear saved progress" wipes it on a shared device.

### Subscription paywall

The free tier allows three rounds a day; starting a fourth offers the monthly or
yearly plan instead, and the allowance resets at local midnight. Subscribing
lifts the limit until the plan's term is up, after which access falls back to the
free tier on its own.

**Checkout is a placeholder.** Choosing a plan takes no payment and contacts no
payment provider — it only records the choice in `localStorage`. Wiring up a
real provider is still to do.

The allowance is metered on its own per-day counter
(`education-academy:usage:v1`), deliberately separate from the dashboard's round
history, so clearing that history does not hand back free rounds. Being
client-side, it is a product rule rather than a security boundary: enforcing it
against a determined user needs a server, which this build does not have.

## Testing

Tests run on [Vitest](https://vitest.dev) with
[Testing Library](https://testing-library.com) in a jsdom environment. Test files
sit next to the code they cover as `*.test.ts` / `*.test.tsx`.

```bash
npm test
```
