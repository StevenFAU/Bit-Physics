import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  server: { fs: { allow: [new URL("../../..", import.meta.url).pathname] } },
  build: { outDir: "dist", target: "es2022", sourcemap: true },
});
