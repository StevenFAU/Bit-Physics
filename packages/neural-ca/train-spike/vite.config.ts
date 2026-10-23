import { defineConfig } from "vite";

// Throwaway spike page (rebuild-v2 04-neural-ca.md M0). Not part of the npm
// workspace or the web-deploy pipeline; built only by run-spike.mjs.
export default defineConfig({
  root: __dirname,
  base: "./",
  build: { outDir: process.env.SPIKE_OUT ?? "dist", emptyOutDir: true, target: "es2022", sourcemap: false },
});
