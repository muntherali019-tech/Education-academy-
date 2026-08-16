# Vision endpoints

The camera features — photo marking and scan & solve — call the Claude API,
which needs an API key. **The key must never reach the browser**, so the browser
posts the photo to an endpoint and this directory is what runs behind it.

```
browser  ──POST /api/mark──▶  handleMarkRequest   ──▶  createClaudeMarker  ──┐
(no key)  ──POST /api/solve─▶  handleSolveRequest  ──▶  createClaudeSolver ──┴─▶ Claude API
                               (validate the body)      (hold ANTHROPIC_API_KEY)
```

| File | What it is |
| --- | --- |
| `claudeVision.ts` | Shared request building and reply parsing for both features |
| `claudeMarker.ts` | The marking prompt and schema |
| `claudeSolver.ts` | The scan-and-solve prompt and schema |
| `photoRequest.ts` | Body validation, rate limiting and failure handling shared by both handlers |
| `rateLimit.ts` | The sliding-window limiter |
| `photoLimits.ts` | The per-client and overall limits both endpoints share |
| `clientKey.ts` | Works out who to count a request against |
| `markHandler.ts` / `solveHandler.ts` | Transport-agnostic: parsed body in, `{ status, body }` out |
| `markingApiPlugin.ts` | Mounts both handlers on the Vite dev server |
| `httpApi.ts` | Mounts both handlers on a plain `node:http` server (production) |
| `serve.ts` | The production process: serves `dist/` and the API. Bootstrap only |

## Running it in development

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Without the key the endpoints answer `501` and the app says the feature is not
switched on — everything else still works, and the test suite never needs a key.

## Deploying it

**There is a production server in the box.** `serve.ts` serves the built app and
both endpoints from one `node:http` process — no framework, no extra dependency:

```bash
npm run build && npm run build:server && npm start
```

`render.yaml` in the repo root deploys exactly that as a single Render service.
Set `ANTHROPIC_API_KEY` in the dashboard to switch the camera features on.

`TRUST_PROXY=1` tells it to take the client address from `x-forwarded-for`. Set it
only behind a proxy you control that overwrites that header (Render does).
Anywhere a client can reach the process directly, leaving it off is what stops a
caller spoofing the header for a fresh allowance per request.

### Mounting them somewhere else

To run the endpoints on a serverless function or an edge worker instead, mount the
same transport-agnostic handlers there:

```ts
import { handleSolveRequest } from "./solveHandler";
import { createDefaultSolver } from "./claudeSolver";
import { createPhotoLimits, limitsFromEnv } from "./photoLimits";

const solver = createDefaultSolver(); // reads ANTHROPIC_API_KEY once, at startup
const limits = createPhotoLimits(limitsFromEnv(process.env)); // create once, not per request

export async function POST(request: Request): Promise<Response> {
  const key = clientAddress(request); // however your platform exposes it
  const { status, body, headers } = await handleSolveRequest(await request.json(), solver, {
    limits: limits.for(key),
  });
  return Response.json(body, { status, headers });
}
```

Create the limiters **once, at startup**. Building them per request gives every
request a fresh allowance, which is the same as having no limit at all. If you
run more than one instance, each holds its own counts in memory — the effective
limit is multiplied by the instance count, so use a shared store (or your
platform's own limiter) if that matters.

Point the browser at them with `VITE_MARKING_ENDPOINT` and `VITE_SOLVE_ENDPOINT`
if they are not served from `/api/mark` and `/api/solve` on the same origin.

## The contract

Both endpoints take the same **request** — `POST`, `content-type: application/json`:

```json
{ "stage": "ks2", "mediaType": "image/png", "base64": "<the photo, base64, no data URL prefix>" }
```

`/api/mark` **200** — one item per question found on the page:

```json
{
  "overall": "Great effort — two out of three!",
  "items": [
    { "question": "7 x 8?", "studentAnswer": "56", "verdict": "correct", "comment": "Spot on." },
    { "question": "9 x 6?", "studentAnswer": "56", "verdict": "incorrect", "comment": "Try counting up." },
    { "question": "12 / 4?", "studentAnswer": "", "verdict": "unclear", "comment": "Too blurry to read." }
  ]
}
```

`/api/solve` **200** — the worked method for the first problem on the page:

```json
{
  "problem": "3x + 6 = 21",
  "steps": [
    { "explanation": "Take 6 from both sides.", "working": "3x = 15" },
    { "explanation": "Divide both sides by 3.", "working": "x = 5" }
  ],
  "answer": "x = 5",
  "practice": "Try 4x + 8 = 28."
}
```

An unreadable photo is not an error: `/api/solve` answers 200 with an empty
`problem` and no steps, and `/api/mark` with an empty `items` list. The model is
told to do that rather than guess, and the UI says so.

**Anything else** — `{ "error": "<message safe to show a learner>" }`, with `400`
for a malformed body, `413` for an oversized photo, `429` when a rate limit is
hit (with a `retry-after` header in seconds), `501` when no key is configured,
and `502` when the work itself failed. Error text is deliberately
generic: API failures are caught and replaced so nothing about the key or the
transport reaches the UI (`claudeMarker.test.ts` and `claudeSolver.test.ts` pin
that).

## Rate limiting

Every photo is a paid API call, so both endpoints are limited before any work is
done — an over-limit request costs a map lookup, not a model call. Marking and
solving share one set of limiters, because they share a budget.

| Limit | Default | Environment variable |
| --- | --- | --- |
| Per client, per hour | 20 photos | `PHOTO_RATE_LIMIT_PER_CLIENT` |
| Overall, per hour | 120 photos | `PHOTO_RATE_LIMIT_TOTAL` |

The window slides, so a client gets capacity back gradually rather than all at
once on a fixed boundary. The per-client limit is checked first, so a client
that is already over it cannot also eat into the overall allowance.

**The overall limit is the one that actually caps spend.** Clients are counted by
address, and an address is not a strong identity: `x-forwarded-for` is only
trusted when you pass `trustProxy` (otherwise anyone could spoof it for a fresh
allowance per request), and a caller with many source addresses gets an
allowance for each. Set `PHOTO_RATE_LIMIT_TOTAL` to a number you are willing to
pay for every hour, and treat the per-client limit as politeness rather than
protection.

Two more things this does not do, deliberately: the counts are per process and
held in memory, so they reset on restart and do not add up across instances; and
there is no cost accounting beyond counting photos. For anything user-facing at
scale, put your platform's own limiter in front as well.

## Model and cost

`claude-opus-5`, one request per photo, `effort: "medium"`, capped at
`VISION_MAX_TOKENS`. Both replies are constrained with structured outputs
(`output_config.format`) against the schemas in `src/marking/marking.ts` and
`src/solving/solving.ts`, so the browser gets JSON in a known shape rather than
prose to parse. Both endpoints are rate limited — see above for the defaults and
what they do and do not protect.
