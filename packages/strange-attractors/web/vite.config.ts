import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Two pages share one dist (the deploy pipeline's per-sim contract is
// unchanged): index.html is the v1 page at /sims/strange-attractors/, and
// v2/index.html is the Chaos rebuild (Field Studies, Wave B) at
// /sims/strange-attractors/v2/ — both gated by pipeline.py validate.
// Relative base so the bundle deploys under a GitHub Pages subpath; WGSL is
// imported as raw text (`?raw`).
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
