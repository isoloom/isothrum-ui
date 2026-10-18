import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The editor's unit suite: the pure model and its helpers in Node, with no network. The engine
// tests load the shipped WebAssembly (wasm/) the same way the browser does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    unstubGlobals: true,
    unstubEnvs: true,
    include: ["src/**/*.test.ts"],
  },
});
