import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Stack-B web build for the Growing Neural CA. Relative base so the bundle is
// deployable under a GitHub Pages subpath (5.1 web-deploy). WGSL is imported
// as raw text (`?raw`) — no extra plugin needed.
//
// Two pages share one dist (the deploy pipeline's per-sim contract is
// unchanged): index.html is Grow, the Field Studies rebuild, at
// /sims/neural-ca/, and v1/index.html is the previous page, kept at
// /sims/neural-ca/v1/ for one release (docs/planning/rebuild-v2/README.md,
// release rule) — both gated by pipeline.py validate. public/v2/index.html
// forwards the rebuild's old /v2/ address to the root. Both pages read the
// public/ files through src/sim-root.ts, which resolves them from the bundle
// rather than the page, so either depth works.
const page = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      input: { main: page("./index.html"), v1: page("./v1/index.html") },
    },
  },
});
