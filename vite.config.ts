import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { markingApi } from "./server/markingApiPlugin";

export default defineConfig({
  plugins: [react(), markingApi()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
