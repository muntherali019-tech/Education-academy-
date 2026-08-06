import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds from one codebase:
//   `vite build --mode web`      -> dist-web      (website; payments via Stripe)
//   `vite build --mode app`      -> dist-app      (Capacitor wraps this for Google Play)
//   `vite build --mode onefile`  -> dist-onefile  (ONE self-contained index.html you can open or host anywhere)
// During `npm run dev`, calls to /api are proxied to the Express server on :8787
// so the browser never sees your Anthropic API key.
export default defineConfig(async ({ mode }) => {
  const plugins = [react()];
  const outDir = mode === "app" ? "dist-app" : mode === "onefile" ? "dist-onefile" : "dist-web";

  // Single-file build: inline all JS/CSS into one index.html.
  if (mode === "onefile") {
    try {
      const { viteSingleFile } = await import("vite-plugin-singlefile");
      plugins.push(viteSingleFile());
    } catch {
      console.warn("\n  vite-plugin-singlefile not installed. Run:  npm install -D vite-plugin-singlefile\n");
    }
  }

  return {
    plugins,
    build: { outDir, emptyOutDir: true },
    server: { port: 5173, proxy: { "/api": "http://localhost:8787" } },
    // Vitest: client code (src) runs in jsdom for localStorage/window/DOM;
    // server code (Node/Express) runs in the node environment.
    test: {
      globals: true,
      setupFiles: ["./test/setup.js"],
      // test/ holds node:test suites run separately by `node --test test/`;
      // vitest owns the src/ and server/ specs only. Client code needs a DOM
      // (localStorage/window), server code must stay on Node — split into two
      // projects, since vitest 4 dropped environmentMatchGlobs.
      projects: [
        {
          extends: true,
          test: {
            name: "client",
            environment: "jsdom",
            include: ["src/**/*.{test,spec}.{js,jsx}"],
          },
        },
        {
          extends: true,
          test: {
            name: "server",
            environment: "node",
            include: ["server/**/*.{test,spec}.{js,jsx}"],
          },
        },
      ],
    },
  };
});
