import Anthropic from "@anthropic-ai/sdk";
import {
  MARKING_SCHEMA,
  MarkingError,
  parseMarkingResult,
  type Marker,
  type MarkingRequest,
} from "../src/marking/marking";
import { STAGES } from "../src/game/stages";
import {
  askForJson,
  buildVisionRequest,
  VISION_MAX_TOKENS,
  VISION_MODEL,
  type MessageCreator,
} from "./claudeVision";

export const MARKING_MODEL = VISION_MODEL;
export const MARKING_MAX_TOKENS = VISION_MAX_TOKENS;

export type { MessageCreator };

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

export function buildMarkingRequest(
  request: MarkingRequest,
): Anthropic.MessageCreateParamsNonStreaming {
  return buildVisionRequest({
    request,
    system: systemPrompt(request.stage),
    schema: MARKING_SCHEMA,
    instruction: "Mark this homework.",
  });
}

/** Mark a photo with Claude. */
export function createClaudeMarker(client: MessageCreator): Marker {
  return async (request) => {
    const payload = await askForJson(
      client,
      buildMarkingRequest(request),
      {
        failed: "Mochi could not mark that photo. Please try again.",
        refused: "Mochi could not mark that photo. Try a photo of the homework page.",
        tooLong: "That page has too much on it. Try photographing one page at a time.",
        garbled: "Mochi could not read the marking. Please try again.",
      },
      (message) => new MarkingError(message),
    );

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
