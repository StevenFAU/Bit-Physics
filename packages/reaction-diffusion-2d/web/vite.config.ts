import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Stack-B web build for Gray-Scott RD-2D. Relative base so the bundle is
// deployable under a GitHub Pages subpath (5.1 web-deploy). WGSL is imported
// as raw text (`?raw`) — no extra plugin needed.
//
// Two pages share one dist (the deploy pipeline's per-sim contract is
// unchanged): index.html is the v1 page at /sims/reaction-diffusion-2d/, and
// v2/index.html is the Turing Patterns rebuild (Field Studies pilot) at
// /sims/reaction-diffusion-2d/v2/ — both gated by pipeline.py validate.
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
