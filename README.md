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
  game/            Game rules and progress (framework-free, fully unit tested)
    stages.ts      The four UK stages and age-to-stage mapping
    questions.ts   Question bank, filtered by stage
    round.ts       Round creation, answering and scoring
    random.ts      Seeded PRNG + shuffle, so rounds are reproducible
    progress.ts    Round results and the dashboard aggregations
    storage.ts     Reads/writes progress, tolerating corrupt or absent storage
  test/setup.ts    Vitest setup (jest-dom matchers)
  App.tsx          Stage picker and round UI
  Dashboard.tsx    Parent/teacher progress view
  main.tsx         React entry point
```

The game rules live in `src/game/` with no React imports, so they can be tested
directly and reused later by the marking features.

### Progress tracking

Finishing a round records a result, which the parent/teacher dashboard
aggregates into overall totals, a per-stage breakdown, and a list of recent
rounds. A stage that has never been played shows `—` rather than `0%`, so an
unplayed stage is not mistaken for a failed one.

History persists to `localStorage` under a versioned key. Storage is treated as
untrusted: corrupt JSON, a non-array payload, or individual malformed entries
are discarded rather than thrown, and a failed write (quota, private mode) is
reported instead of crashing the game. Where storage is unavailable entirely,
progress still works for the session but is not persisted.

Dates render in UTC so the same history reads identically wherever it is opened.

### Current status

Implemented so far: stage selection, 15-question puzzle rounds with seeded and
reproducible question order, scoring against a 60% pass mark, and the
parent/teacher dashboard with progress tracking.

Still to build: AI homework photo-marking, the scan-and-solve helper, and the
subscription paywall. Each of those needs a decision on credentials and whether
to add a backend — none exists yet.

## Testing

Tests run on [Vitest](https://vitest.dev) with
[Testing Library](https://testing-library.com) in a jsdom environment. Test files
sit next to the code they cover as `*.test.ts` / `*.test.tsx`.

```bash
npm test
```
