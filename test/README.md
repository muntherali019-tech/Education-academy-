# Tests

Automated tests run with [Vitest](https://vitest.dev).

```bash
npm test          # run once (CI)
npm run test:watch  # watch mode during development
```

## Layout & environments

Tests live next to the code they cover as `*.test.js`:

- `src/lib/*.test.js` — client logic. Runs in the **jsdom** environment so
  `localStorage`, `window` and the DOM are available.
- `server/*.test.js` — Express/Node logic. Runs in the **node** environment.

The environment is selected automatically by `environmentMatchGlobs` in
`vite.config.js` (`src/**` → jsdom, everything else → node). Shared setup
(jest-dom matchers, `localStorage` reset between tests) lives in
`test/setup.js`.

## What's covered so far

Priority was pure, high-value logic that is cheap to test and expensive to get
wrong:

| Area | File | Notes |
|------|------|-------|
| Progress / streaks / stats | `src/lib/progress.test.js` | Streak-freeze date math, daily reset, stats aggregation, history caps. Uses a fixed clock. |
| Achievements | `src/lib/achievements.test.js` | Every badge threshold and edge (e.g. perfect round needs total ≥ 5). |
| AI response parsing | `src/lib/api.test.js` | `extractJSON` fence/prose stripping; question filtering with a mocked `fetch`. |
| Offline exam cache | `src/lib/examCache.test.js` | De-dup, malformed-question rejection, 300-per-course cap. |
| Speech match | `src/lib/recognition.test.js` | Accent/punctuation-insensitive lenient matching. |
| Free trial | `src/lib/trial.test.js` | 72-hour window boundaries with a fixed clock. |
| Mochi shop | `src/lib/mochiShop.test.js` | Item costs, equipped-look persistence. |
| Auth | `server/auth.test.js` | Password hash/verify, token sign/verify, tamper rejection. |
| Store | `server/store.test.js` | `overview`/`weakest` aggregation, id/code generators. |

## Suggested next steps

Not yet covered (see the higher-risk areas):

- **Stripe webhook** handling in `server/index.js` (signature verification,
  grant/revoke) — needs `supertest` against the Express app.
- **API authorization** (`canAccessChild`, `editGoal`, cascade deletes,
  referral anti-abuse) — `supertest` with the file store in a temp dir.
- **React components** (`ErrorBoundary`, `Calculator`, locked/unlocked gating)
  with `@testing-library/react` (already installed).
