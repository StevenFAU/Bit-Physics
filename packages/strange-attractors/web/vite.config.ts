import { defineConfig } from "vite";

// Stack-B web build for Gray-Scott RD-2D. Relative base so the bundle is
// deployable under a GitHub Pages subpath (5.1 web-deploy). WGSL is imported
// as raw text (`?raw`) — no extra plugin needed.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: true,
  },
});
