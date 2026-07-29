/**
 * An error whose message is written for a learner and is safe to show as-is.
 * Everything else is replaced with a general message before it reaches the UI,
 * so nothing about the API, the key or the transport leaks out.
 */
export class LearnerError extends Error {
  constructor(message: string, name = "LearnerError") {
    super(message);
    this.name = name;
  }
}

export function learnerMessage(error: unknown, fallback: string): string {
  return error instanceof LearnerError ? error.message : fallback;
}
