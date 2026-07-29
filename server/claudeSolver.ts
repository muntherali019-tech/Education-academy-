import Anthropic from "@anthropic-ai/sdk";
import { STAGES } from "../src/game/stages";
import {
  parseSolution,
  SOLUTION_SCHEMA,
  SolveError,
  type Solver,
  type SolveRequest,
} from "../src/solving/solving";
import {
  askForJson,
  buildVisionRequest,
  VISION_MAX_TOKENS,
  VISION_MODEL,
  type MessageCreator,
} from "./claudeVision";

export const SOLVING_MODEL = VISION_MODEL;
export const SOLVING_MAX_TOKENS = VISION_MAX_TOKENS;

function systemPrompt(stage: SolveRequest["stage"]): string {
  return [
    `You are Mochi, a friendly ginger cat helping a UK learner at ${STAGES[stage].name} with a problem they are stuck on.`,
    "You are given a photo containing one problem. Read it, then show how to solve it.",
    "Teach the method, do not just answer. Break the solution into the steps a learner would follow, in order, each one small enough to follow on its own.",
    "Explain every step in language a learner at that stage will understand, using methods they will have been taught.",
    "If the photo shows more than one problem, solve the first one only. If no problem can be read, return an empty problem, no steps and an empty answer — never guess at what the problem might be.",
    "Finish with a similar problem they can try themselves, unless one would not help.",
  ].join("\n");
}

export function buildSolveRequest(
  request: SolveRequest,
): Anthropic.MessageCreateParamsNonStreaming {
  return buildVisionRequest({
    request,
    system: systemPrompt(request.stage),
    schema: SOLUTION_SCHEMA,
    instruction: "Show me how to solve this.",
  });
}

/** Solve a photographed problem with Claude. */
export function createClaudeSolver(client: MessageCreator): Solver {
  return async (request) => {
    const payload = await askForJson(
      client,
      buildSolveRequest(request),
      {
        failed: "Mochi could not solve that problem. Please try again.",
        refused: "Mochi could not solve that one. Try a photo of the question by itself.",
        tooLong: "That problem was too long to work through. Try photographing one question.",
        garbled: "Mochi could not read the working. Please try again.",
      },
      (message) => new SolveError(message),
    );

    const solution = parseSolution(payload);
    if (solution === null) {
      throw new SolveError("Mochi could not read the working. Please try again.");
    }
    return solution;
  };
}

/** The real client. Reads `ANTHROPIC_API_KEY` from the environment. */
export function createDefaultSolver(): Solver {
  return createClaudeSolver(new Anthropic());
}
