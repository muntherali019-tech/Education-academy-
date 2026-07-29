import Anthropic from "@anthropic-ai/sdk";
import type { PhotoRequest } from "../src/photo/photo";

export const VISION_MODEL = "claude-opus-5";

/** Room for the model to think and to work through a full page. */
export const VISION_MAX_TOKENS = 16000;

/** The Anthropic client surface these modules use — a fake stands in for tests. */
export interface MessageCreator {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

export interface VisionRequestOptions {
  request: PhotoRequest;
  system: string;
  /** JSON schema the reply is constrained to. */
  schema: Record<string, unknown>;
  /** The one-line instruction that follows the photo. */
  instruction: string;
}

export function buildVisionRequest({
  request,
  system,
  schema,
  instruction,
}: VisionRequestOptions): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: VISION_MODEL,
    max_tokens: VISION_MAX_TOKENS,
    system,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: request.mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: request.base64,
            },
          },
          { type: "text", text: instruction },
        ],
      },
    ],
  };
}

/** What to tell the learner when each thing goes wrong. */
export interface FailureCopy {
  /** The API call itself failed. */
  failed: string;
  /** The model declined. */
  refused: string;
  /** The reply ran past the token limit. */
  tooLong: string;
  /** The reply arrived but was not the expected JSON. */
  garbled: string;
}

function textFrom(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * Send a vision request and return the parsed JSON reply. Every failure becomes
 * an error carrying a message that is safe to show a learner — nothing about
 * the model, the key or the transport leaks into the UI.
 */
export async function askForJson(
  client: MessageCreator,
  params: Anthropic.MessageCreateParamsNonStreaming,
  copy: FailureCopy,
  fail: (message: string) => Error,
): Promise<unknown> {
  let message: Anthropic.Message;
  try {
    message = await client.messages.create(params);
  } catch {
    throw fail(copy.failed);
  }

  if (message.stop_reason === "refusal") {
    throw fail(copy.refused);
  }
  if (message.stop_reason === "max_tokens") {
    throw fail(copy.tooLong);
  }

  try {
    return JSON.parse(textFrom(message));
  } catch {
    throw fail(copy.garbled);
  }
}
