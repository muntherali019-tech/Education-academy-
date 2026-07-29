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
| `photoRequest.ts` | Body validation and failure handling shared by both handlers |
| `markHandler.ts` / `solveHandler.ts` | Transport-agnostic: parsed body in, `{ status, body }` out |
| `markingApiPlugin.ts` | Mounts both handlers on the Vite dev server |

## Running it in development

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Without the key the endpoints answer `501` and the app says the feature is not
switched on — everything else still works, and the test suite never needs a key.

## Deploying it

Mount the handlers on whatever you deploy (a Node server, a serverless function,
an edge worker with a Node-compatible runtime):

```ts
import { handleSolveRequest } from "./solveHandler";
import { createDefaultSolver } from "./claudeSolver";

const solver = createDefaultSolver(); // reads ANTHROPIC_API_KEY once, at startup

export async function POST(request: Request): Promise<Response> {
  const { status, body } = await handleSolveRequest(await request.json(), solver);
  return Response.json(body, { status });
}
```

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
for a malformed body, `413` for an oversized photo, `501` when no key is
configured, and `502` when the work itself failed. Error text is deliberately
generic: API failures are caught and replaced so nothing about the key or the
transport reaches the UI (`claudeMarker.test.ts` and `claudeSolver.test.ts` pin
that).

## Model and cost

`claude-opus-5`, one request per photo, `effort: "medium"`, capped at
`VISION_MAX_TOKENS`. Both replies are constrained with structured outputs
(`output_config.format`) against the schemas in `src/marking/marking.ts` and
`src/solving/solving.ts`, so the browser gets JSON in a known shape rather than
prose to parse. There is no rate limiting here — add it at your deployment
boundary before exposing these endpoints publicly.
