# Verifying Education Academy

## What I checked in this environment ✅
Run against every file in the project:
- **JavaScript syntax** (`node --check`) — all `server/*.js`, `src/lib/*.js`, `src/data/*.js`, `vite.config.js`: pass.
- **JSX/React** (TypeScript transpile check) — `App.jsx`, all `components/*.jsx`, `main.jsx`: pass.
- **JSON validity** — `package.json`, `capacitor.config.json`, `manifest.webmanifest`: pass.
- **HTML** — all `marketing/*.html` + `index.html` well-formed.
- **Component imports** — every `<Component>` used in `App.jsx` is either imported or defined in-file (no undefined components).

## What could NOT be checked here (no internet in this sandbox)
- `npm install` (so no dependency resolution)
- `vite build` / a real production bundle
- Runtime behaviour, the AI calls, Stripe, Postgres, notifications

These need a one-time run on your machine or in **Claude Code**.

---

## Verify it in Claude Code (1 step)
I can't push to Claude Code from here, but you can hand it the project in seconds:

1. **Unzip** `education-academy.zip` to a folder.
2. Open that folder in a terminal and start Claude Code:
   ```
   cd education-academy
   claude
   ```
   (Claude Code is the CLI/desktop coding agent — install per docs.claude.com if needed.)
3. Paste this prompt:
   > Review this Vite + React + Express project for bugs and dead code. Then run `npm install`, `npm run build:web`, and `npm run build:app`, and report any errors. Don't change anything until I approve.

Claude Code will install, build, and tell you about any issues — and can fix them in place.

## Or verify locally by hand
```
npm install
npm run dev            # http://localhost:5173 (mock billing, instant unlock — great for a quick look)
npm run build:web      # production website bundle  -> dist-web
npm run build:app      # Capacitor/Play bundle       -> dist-app
npm run build:onefile  # single self-contained file  -> dist-onefile/index.html
```
First run only, if you use them:
```
npm install -D vite-plugin-singlefile          # for build:onefile
npm install pg                                  # only if you set DATABASE_URL (Postgres)
npm install @capacitor/local-notifications      # only for app reminders
```

## Expected "it's working" checks
- `npm run dev` shows the home screen with Mochi, the daily strip (badges / shop / leaderboard), and the Daily Challenge tile.
- A brand-new profile is dropped straight into the first Daily Challenge (the "instant win").
- The Mochi shop has Colours, Hats and Extras (incl. **Streak freeze**).
- Ask Mochi and Smart Practice appear on the home screen.
- AI features (quizzes, Ask Mochi, scan/mark) need `ANTHROPIC_API_KEY` set for the server (`.env`).

If a build error mentions a missing optional package, install it from the list above and re-run.
