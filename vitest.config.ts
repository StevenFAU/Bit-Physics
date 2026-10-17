// Unit tests for the npm workspace: the shared Field Studies packages (web/*)
// and the pure logic of rebuilt sims (packages/<sim>/web/test). GPU work is
// exercised in the browser by each sim's acceptance script and gate.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["web/*/src/**/*.test.ts", "packages/*/web/test/**/*.test.ts"],
    environment: "node",
  },
});
