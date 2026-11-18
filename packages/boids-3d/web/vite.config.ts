import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Two pages share one dist (the deploy pipeline's per-sim contract is
// unchanged): index.html is the v1 page (Murmuration Lab) at /sims/boids-3d/,
// and v2/index.html is the Murmuration rebuild (Field Studies, Wave B) at
// /sims/boids-3d/v2/ — both gated by pipeline.py validate. Relative base so
// the bundle deploys under a GitHub Pages subpath (web-deploy standalone-serve
// constraint); WGSL is imported as raw text (`?raw`) — no extra plugin needed.
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
