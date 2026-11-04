import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Swarm is the root page; the previous v4 lab stays at v1/ for one release.
// Both pages share one dist and pass the same pipeline.py validate gate.
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
