import { defineConfig } from "vitest/config";

// Vitest is configured to run from `common/common-ts/`. WebGPU-device-
// requiring tests are marked `test.skip` at the call site per spec
// section 7.8 (CI runners have no real GPU); local-only invocations of
// `pnpm vitest run --no-skip` exercise the full suite.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "examples/**/*.test.ts"],
    environment: "node",
    pool: "forks",
    testTimeout: 30_000,
  },
});
