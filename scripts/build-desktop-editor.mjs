#!/usr/bin/env node
// Builds the editor as a static page for a desktop/offline host (Tauri): the script, the styles,
// the fonts and the WebAssembly engine, into the folder given (default out-desktop/).
//   node scripts/build-desktop-editor.mjs [out]
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = resolve(process.argv[2] ?? join(root, "out-desktop"));
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: { editor: join(root, "desktop-editor/main.tsx") },
  bundle: true,
  format: "esm",
  outdir: out,
  minify: true,
  sourcemap: false,
  jsx: "automatic",
  loader: { ".woff2": "file", ".woff": "file" },
  assetNames: "fonts/[name]-[hash]",
  // The package's "@/..." imports resolve to src/.
  alias: { "@": join(root, "src") },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  // Some libraries read process.env beyond what's defined above: no Node here.
  banner: { js: 'globalThis.process ??= { env: { NODE_ENV: "production" } };' },
  // The engine is loaded at run time from /wasm, as on the site.
  external: ["/wasm/*"],
  logLevel: "warning",
});

execFileSync(join(root, "node_modules/.bin/tailwindcss"), ["-i", join(root, "desktop-editor/editor.css"), "-o", join(out, "styles.css"), "--minify"], {
  cwd: root,
  stdio: ["ignore", "ignore", "inherit"],
});
cpSync(join(root, "desktop-editor/index.html"), join(out, "index.html"));
cpSync(join(root, "wasm"), join(out, "wasm"), { recursive: true });
console.log(`desktop editor: ${out}`);
