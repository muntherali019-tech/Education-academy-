# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## Current state of the repo

The app is implemented and tested. Stack: **React 19 + TypeScript on Vite 8**,
tested with **Vitest** (jsdom + Testing Library). ESM throughout
(`"type": "module"`), Node >= 22.

```
src/
  App.tsx            app shell and screen routing
  game/              core logic: stages, questions, rounds, progress,
                     subscription, storage (each with a .test.ts beside it)
  marking/           AI homework marking (client + view)
  photo/             photo capture/handling for scan-and-solve
  test/setup.ts      Vitest setup (jest-dom matchers)
server/              Express backend
```

Commands: `npm run dev` (Vite), `npm test` (Vitest), `npm run typecheck`
(`tsc --noEmit`), `npm run build`, `npm run test:coverage`.

Logic lives in `src/game`, `src/marking`, `src/photo` as plain modules with
unit tests alongside; components stay presentational. Keep that split, and
keep this file accurate when the structure changes.
## Product vision

**Education-academy** ("A service for students and learners") is a cat-themed
learning game for UK learners, hosted by **Mochi the ginger cat**. The intended
scope, from `README.md`:

- **Four learning stages** aligned to the UK system:
  - Key Stage 1
  - Key Stage 2
  - Key Stage 3
  - Higher Education
- **15-question puzzle rounds** as the core gameplay loop.
- **AI homework photo-marking** — learners photograph homework and it is marked.
- **Scan-and-solve helper** — scan a problem and get a worked solution.
- **Subscription paywall** — gated premium access.
- **Parent/teacher dashboard** with progress tracking.

Treat this list as the product backlog. When building a feature, map it back to
one of these areas and keep the cat/Mochi theming consistent in user-facing copy.

## When you add code

There are no enforced conventions yet, so establish sensible ones and record them
here. Suggested baseline (adjust as the project takes shape):

1. **Pick and document the stack.** When you introduce a language/framework, add
   a section below describing it, the directory layout, and how to run it.
2. **Add the standard scripts** a contributor expects — install, run/dev, build,
   test, lint/format — and document the exact commands here once they exist.
3. **Keep secrets out of the repo.** The product involves subscriptions/payments
   and AI services; never commit API keys or credentials. Use environment
   variables and provide a committed `.env.example` (without real values).
4. **Mind learner data.** This app targets children and schools (UK). Be
   conservative with personal data, and flag anything with privacy/safeguarding
   implications rather than guessing.
5. **Write tests alongside features** and wire them into CI before the codebase
   grows large enough that retrofitting is painful.

Update the placeholders below as soon as the corresponding pieces exist.

### Tech stack
_Not yet chosen. Document language, framework, and major dependencies here._

### Project structure
_Not yet established. Document the directory layout here once code is added._

### Development commands
_None yet. Once tooling exists, list the exact commands, e.g.:_
- Install: _TBD_
- Run / dev server: _TBD_
- Build: _TBD_
- Test: _TBD_
- Lint / format: _TBD_

## Git workflow

- The default branch is `main`.
- Do work on feature branches, not directly on `main`.
- Use clear, descriptive commit messages.
- Open a pull request for review rather than pushing to `main` directly.

## Keeping this file current

This document is only useful if it reflects reality. Whenever you add a stack,
tooling, directory structure, or convention, update the relevant section above
in the same change — replace the `TBD` / "not yet" placeholders with the actual
details.
