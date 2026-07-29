import { postPhoto } from "../photo/photoClient";
import { parseSolution, SolveError, type Solution, type Solver } from "./solving";

/** Served alongside the marking endpoint; see `server/README.md`. */
export const DEFAULT_SOLVE_ENDPOINT = "/api/solve";

export function configuredSolveEndpoint(): string {
  const configured = import.meta.env?.VITE_SOLVE_ENDPOINT;
  return typeof configured === "string" && configured !== "" ? configured : DEFAULT_SOLVE_ENDPOINT;
}

export interface HttpSolverOptions {
  endpoint?: string;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetchFn?: typeof fetch;
}

export function createHttpSolver({ endpoint, fetchFn }: HttpSolverOptions = {}): Solver {
  return async (request) => {
    const payload = await postPhoto({
      url: endpoint ?? configuredSolveEndpoint(),
      request,
      fetchFn,
      fail: (message) => new SolveError(message),
      verb: "solve",
    });
    const solution: Solution | null = parseSolution(payload);
    if (solution === null) {
      throw new SolveError("Mochi could not read the working that came back.");
    }
    return solution;
  };
}
