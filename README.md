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
  game/            Stage, question and round logic (framework-free, fully unit tested)
    stages.ts      The four UK stages and age-to-stage mapping
    questions.ts   Question bank, filtered by stage
    round.ts       Round creation, answering and scoring
    random.ts      Seeded PRNG + shuffle, so rounds are reproducible
  test/setup.ts    Vitest setup (jest-dom matchers)
  App.tsx          Stage picker and round UI
  main.tsx         React entry point
```

The game rules live in `src/game/` with no React imports, so they can be tested
directly and reused later by the dashboard and marking features.

### Current status

Implemented so far: stage selection and 15-question puzzle rounds with seeded,
reproducible question order and scoring against a 60% pass mark.

Still to build: AI homework photo-marking, the scan-and-solve helper, the
subscription paywall, and the parent/teacher dashboard.

## Testing

Tests run on [Vitest](https://vitest.dev) with
[Testing Library](https://testing-library.com) in a jsdom environment. Test files
sit next to the code they cover as `*.test.ts` / `*.test.tsx`.

```bash
npm test
```
