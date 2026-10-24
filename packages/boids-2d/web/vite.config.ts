import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Two pages share one dist (the deploy pipeline's per-sim contract is
// unchanged): index.html is the v1 page (the v4 lab) at /sims/boids-2d/, and
// v2/index.html is the Swarm rebuild (Field Studies, Wave A) at
// /sims/boids-2d/v2/ — both gated by pipeline.py validate.
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
