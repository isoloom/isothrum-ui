#!/usr/bin/env node
// Bundles the package's two entries to ESM, leaving every dependency external so the host's bundler
// resolves and dedupes them (React above all). Types are emitted separately by tsc.
//   node scripts/build-lib.mjs
import { build } from "esbuild";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const common = {
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2020",
  jsx: "automatic",
  sourcemap: true,
  // "@/..." resolves to src/; everything else stays an external import.
  alias: { "@": resolve(root, "src") },
  packages: "external",
  logLevel: "warning",
};

// The React component entry: a client module for the host (Next marks it so).
await build({
  ...common,
  entryPoints: { index: resolve(root, "src/index.ts") },
  outdir: resolve(root, "dist"),
  banner: { js: '"use client";' },
});

// The pure lab-model entry: no React, safe on a server (no "use client").
await build({
  ...common,
  entryPoints: { model: resolve(root, "src/model.ts") },
  outdir: resolve(root, "dist"),
});

console.log("lib: dist/index.js, dist/model.js");
