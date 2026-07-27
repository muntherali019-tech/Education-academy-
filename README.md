# Education-academy-
A service for students and learners 
A cat-themed learning game for UK learners, hosted by Mochi the ginger cat. Covers four stages — Key Stage 1, Key Stage 2, Key Stage 3, and Higher Education — with 15-question puzzle rounds, AI homework photo-marking, a scan-and-solve helper, a subscription paywall, and a parent/teacher dashboard with progress tracking.

The whole app is a single self-contained file: [`index.html`](index.html).

## Features

- **Play** — pick a stage and answer a 15-question puzzle round with instant, warm scoring.
- **Homework marking** — snap a photo of your work and Mochi returns a score out of 100 with encouraging, specific feedback (demo marking runs on-device; no photo leaves the browser).
- **Courses & exam prep** — bite-size lessons and revision checklists for SATs, GCSEs and beyond.
- **Dashboard** — rounds played, average score and topic mastery, saved on the device.
- **Subscription paywall** — a free daily allowance with a Premium upgrade.

## Getting started

```bash
npm install      # no runtime dependencies
npm run dev      # serve the app at http://localhost:3000
npm test         # run the logic test suite (node --test)
```

The test suite loads the pure logic block straight out of `index.html`, so tests exercise exactly what the app ships.
