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
| `npm run test:coverage` | Run tests once with a coverage report |
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
  photo/                Photo handling shared by both camera features
    photo.ts            Format and size checks, reading a chosen file
    photoClient.ts      Posting a photo to a vision endpoint
  marking/              AI homework photo-marking (browser half)
    marking.ts          Marking types, the JSON schema and result validation
    markingClient.ts    Posts the photo to the marking endpoint
    MarkingView.tsx     Photo picker and marked-up results
  solving/              Scan and solve (browser half)
    solving.ts          Solution types, the JSON schema and validation
    solvingClient.ts    Posts the photo to the solving endpoint
    SolveView.tsx       Photo picker and step-by-step walkthrough
  errors.ts             The learner-facing error type both features share
  test/setup.ts         Vitest setup (jest-dom matchers)
  App.tsx               Stage picker, round UI, dashboard, plans and the camera features
  main.tsx              React entry point
server/                 The vision endpoints — hold the API key, never shipped to the browser
```

The game rules live in `src/game/` with no React imports, so they can be tested
directly and reused later by the dashboard and marking features.

### Current status

Everything on the original plan is now built: stage selection and 15-question
puzzle rounds with seeded, reproducible question order and scoring against a 60%
pass mark, the parent/teacher dashboard, the subscription paywall, AI homework
photo-marking and the scan-and-solve helper — each described below.

The one thing still stubbed is checkout: choosing a plan takes no payment.

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

### AI homework photo-marking

Subscribers can photograph a homework page and have Mochi mark it question by
question: each one comes back as correct, not quite, or "could not read", with a
short comment for the learner and a score for the page. Marking is gated behind a
subscription because every photo costs a real API call.

It runs on `claude-opus-5` with vision, and the reply is constrained with
structured outputs so the browser receives JSON in a known shape rather than
prose to parse. The model is told to mark against the chosen UK stage and to
answer "unclear" rather than guess when the photo or handwriting cannot be read.

### Scan and solve

Stuck on one question rather than finished with a page? Photograph it and Mochi
works it out — but the walkthrough reveals **one step at a time**, and the answer
only after the last step. A learner who is stuck half way gets unstuck without
being handed the answer, and finishes with a similar problem to try themselves.
Also for subscribers, for the same reason as marking.

When the photo can't be read, both features say so rather than guessing: the
model is told to return nothing rather than invent a question it can't see.

### Where the API key lives

**It never reaches the browser.** Photos are posted to endpoints that hold the
key. `server/` is those endpoints: transport-agnostic request handling plus a
Vite dev-server plugin, so `npm run dev` marks and solves for real once
`ANTHROPIC_API_KEY` is set — copy `.env.example` to `.env.local` to do that.
Without a key the endpoints answer 501 and the app says the feature is not
switched on; nothing else is affected, and the test suite never needs a key.
`server/README.md` has the contract and how to deploy it. There is no rate
limiting in this build — add it at your deployment boundary before exposing the
endpoints publicly.

### The free allowance

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
npm test              # run once
npm run test:coverage # run once with a coverage report
```

Coverage thresholds live in `vite.config.ts` and CI runs `test:coverage`, so a
drop in coverage fails the build. They are **floors set just under current
coverage** — raise them as coverage grows rather than lowering them to make a
change pass.

Nothing in the suite needs an API key. The vision endpoints are served in
development by the Vite plugin in `server/markingApiPlugin.ts`, which takes
injectable `createMarker` / `createSolver` factories; the tests pass fakes, so
the Anthropic SDK is never loaded and no network call is made.
