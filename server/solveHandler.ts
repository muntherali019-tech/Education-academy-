import type { Solver } from "../src/solving/solving";
import {
  handlePhotoRequest,
  type HandlerResponse,
  type PhotoRequestOptions,
} from "./photoRequest";

/**
 * Handle one scan-and-solve request. Transport-agnostic: give it the parsed
 * body and a solver, and it returns the status and JSON to send back.
 */
export function handleSolveRequest(
  raw: unknown,
  solver: Solver,
  options?: PhotoRequestOptions,
): Promise<HandlerResponse> {
  return handlePhotoRequest(
    raw,
    solver,
    "Mochi could not solve that problem. Please try again.",
    options,
  );
}
