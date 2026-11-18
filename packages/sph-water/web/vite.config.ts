import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Two pages share one dist (the deploy pipeline's per-sim contract is
// unchanged): index.html is the v1 page at /sims/sph-water/, and
// v2/index.html is the Water in Hand rebuild (Field Studies, Wave C) at
// /sims/sph-water/v2/ — both gated by pipeline.py validate. Relative base so
// the bundle deploys under a GitHub Pages subpath (web-deploy
// standalone-serve constraint); WGSL is imported as raw text (`?raw`).
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
