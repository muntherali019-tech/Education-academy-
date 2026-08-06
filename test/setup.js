// Global test setup. jsdom-based (src) tests get jest-dom matchers and a clean
// localStorage between tests; node-based (server) tests are unaffected.
import { afterEach, beforeEach } from "vitest";

// jest-dom matchers (toBeInTheDocument, etc.) — only meaningful under jsdom,
// but importing is harmless in node.
import "@testing-library/jest-dom/vitest";

beforeEach(() => {
  if (typeof localStorage !== "undefined") localStorage.clear();
});

afterEach(() => {
  if (typeof localStorage !== "undefined") localStorage.clear();
});
