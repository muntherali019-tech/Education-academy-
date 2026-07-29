import Anthropic from "@anthropic-ai/sdk";
import {
  MARKING_SCHEMA,
  MarkingError,
  parseMarkingResult,
  type Marker,
  type MarkingRequest,
} from "../src/marking/marking";
import { STAGES } from "../src/game/stages";

export const MARKING_MODEL = "claude-opus-5";

/** Room for the model to think and to mark a full page of questions. */
export const MARKING_MAX_TOKENS = 16000;

function systemPrompt(stage: MarkingRequest["stage"]): string {
  return [
    `You are Mochi, a friendly ginger cat who marks homework for a UK learner at ${STAGES[stage].name}.`,
    "You are given a photo of the learner's homework. Read every question on the page and what the learner wrote for it, then mark each one.",
    "Mark against the UK curriculum for that stage. Judge the learner's answer, not their handwriting.",
    "Use the 'unclear' verdict whenever the photo, the handwriting or the question itself cannot be read confidently — never guess a verdict.",
    "If the page contains no homework at all, return an empty list of items and say so in the summary.",
    "Comments are addressed to the learner: warm, specific and short. For a wrong answer, say what went wrong and give a hint rather than only the right answer.",
  ].join("\n");
}

/** The Anthropic client surface this module uses — a fake stands in for tests. */
export interface MessageCreator {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

export function buildMarkingRequest(
  request: MarkingRequest,
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: MARKING_MODEL,
    max_tokens: MARKING_MAX_TOKENS,
    system: systemPrompt(request.stage),
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: MARKING_SCHEMA,
      },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: request.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: request.base64,
            },
          },
          { type: "text", text: "Mark this homework." },
        ],
      },
    ],
  };
}

function textFrom(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * Mark a photo with Claude. Every failure becomes a `MarkingError` carrying a
 * message that is safe to show a learner — nothing about the model, the key or
 * the transport leaks into the UI.
 */
export function createClaudeMarker(client: MessageCreator): Marker {
  return async (request) => {
    let message: Anthropic.Message;
    try {
      message = await client.messages.create(buildMarkingRequest(request));
    } catch {
      throw new MarkingError("Mochi could not mark that photo. Please try again.");
    }

    if (message.stop_reason === "refusal") {
      throw new MarkingError("Mochi could not mark that photo. Try a photo of the homework page.");
    }
    if (message.stop_reason === "max_tokens") {
      throw new MarkingError("That page has too much on it. Try photographing one page at a time.");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(textFrom(message));
    } catch {
      throw new MarkingError("Mochi could not read the marking. Please try again.");
    }

    const result = parseMarkingResult(payload);
    if (result === null) {
      throw new MarkingError("Mochi could not read the marking. Please try again.");
    }
    return result;
  };
}

/** The real client. Reads `ANTHROPIC_API_KEY` from the environment. */
export function createDefaultMarker(): Marker {
  return createClaudeMarker(new Anthropic());
}
