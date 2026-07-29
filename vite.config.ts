import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { markingApi } from "./server/markingApiPlugin";

export default defineConfig({
  plugins: [react(), markingApi()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      // Scoped to source extensions: a bare "src/**" also matches styles.css
      // and server/README.md, which the provider then fails to parse as JS.
      include: ["src/**/*.{ts,tsx}", "server/**/*.ts"],
      // main.tsx is the DOM bootstrap and setup.ts is test scaffolding —
      // neither has logic worth measuring.
      exclude: ["src/main.tsx", "src/test/**"],
      reporter: ["text", "json-summary"],
      // Floors, not targets: set just under current coverage so a regression
      // fails CI while leaving room for ordinary churn. Raise as coverage grows.
      thresholds: {
        statements: 93,
        branches: 90,
        functions: 95,
        lines: 93,
      },
    },
  },
});
