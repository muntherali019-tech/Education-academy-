# Marking endpoint

Photo marking calls the Claude API, which needs an API key. **The key must never
reach the browser**, so the browser posts the photo to an endpoint and this
directory is what runs behind it.

```
browser  ──POST /api/mark──▶  handleMarkRequest  ──▶  createClaudeMarker  ──▶  Claude API
(no key)                      (validates)             (holds ANTHROPIC_API_KEY)
```

| File | What it is |
| --- | --- |
| `claudeMarker.ts` | Builds the Claude request (vision + JSON schema) and validates the reply |
| `markHandler.ts` | Transport-agnostic request handling — give it a parsed body, get a status and JSON back |
| `markingApiPlugin.ts` | Mounts the handler on the Vite dev server so `npm run dev` marks for real |

## Running it in development

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Without the key the endpoint answers `501` and the app says photo marking is not
switched on — everything else still works, and the test suite never needs a key.

## Deploying it

`handleMarkRequest(body, marker)` is deliberately transport-agnostic: mount it on
whatever you deploy (a Node server, a serverless function, an edge worker with a
Node-compatible runtime). It takes the parsed JSON body and returns
`{ status, body }`.

```ts
import { handleMarkRequest } from "./markHandler";
import { createDefaultMarker } from "./claudeMarker";

const marker = createDefaultMarker(); // reads ANTHROPIC_API_KEY once, at startup

export async function POST(request: Request): Promise<Response> {
  const { status, body } = await handleMarkRequest(await request.json(), marker);
  return Response.json(body, { status });
}
```

Point the browser at it with `VITE_MARKING_ENDPOINT` if it is not served from
`/api/mark` on the same origin.

## The contract

**Request** — `POST`, `content-type: application/json`:

```json
{ "stage": "ks2", "mediaType": "image/png", "base64": "<the photo, base64, no data URL prefix>" }
```

**200** — the marking, one item per question found on the page:

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

**Anything else** — `{ "error": "<message safe to show a learner>" }`, with `400`
for a malformed body, `413` for an oversized photo, `501` when no key is
configured, and `502` when marking itself failed. Error text is deliberately
generic: API failures are caught and replaced so nothing about the key or the
transport reaches the UI (`claudeMarker.test.ts` pins that).

## Model and cost

`claude-opus-5`, one request per photo, `effort: "medium"`, capped at
`MARKING_MAX_TOKENS`. The reply is constrained with structured outputs
(`output_config.format`) against `MARKING_SCHEMA` in `src/marking/marking.ts`, so
the browser gets JSON in a known shape rather than prose to parse. There is no
rate limiting here — add it at your deployment boundary before exposing this
publicly.
