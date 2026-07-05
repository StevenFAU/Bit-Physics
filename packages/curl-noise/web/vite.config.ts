import { defineConfig } from "vite";

// Stack-B web build for curl-noise. Relative base so the bundle is
// deployable under a GitHub Pages subpath (web-deploy standalone-serve
// constraint). WGSL is imported as raw text (`?raw`) — no extra plugin.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: true,
  },
});
