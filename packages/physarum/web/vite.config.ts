import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Stack-B web build for Physarum. Relative base so the bundle is deployable
// under a GitHub Pages subpath (5.1 web-deploy). WGSL is imported as raw text
// (`?raw`) — no extra plugin needed.
//
// Two pages share one dist (the deploy pipeline's per-sim contract is
// unchanged): index.html is the v1 page at /sims/physarum/, and v2/index.html
// is the Slime Mould rebuild (Field Studies, Wave A) at /sims/physarum/v2/ —
// both gated by pipeline.py validate.
const page = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      input: { main: page("./index.html"), v2: page("./v2/index.html") },
    },
  },
});
