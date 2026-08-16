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
      // main.tsx is the DOM bootstrap, serve.ts the process bootstrap, and
      // setup.ts is test scaffolding — none has logic worth measuring. The
      // request handling serve.ts delegates to lives in httpApi.ts, which is
      // covered; keep it that way rather than growing logic in serve.ts.
      exclude: ["src/main.tsx", "server/serve.ts", "src/test/**"],
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
