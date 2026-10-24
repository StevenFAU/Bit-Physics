// The v2 page's release-gate capture is v1's: the gate functions in
// src/v2/proof/gate.ts are v1's src/main.ts text verbatim, the capture is
// deterministic, and it satisfies the predicates verify.py _gate_boids_2d
// applies in CI. (The byte-for-byte comparison of the two pages' captures runs
// in a real browser: v2-acceptance.mjs.)

import { describe, expect, it } from "vitest";
import v1Main from "../src/main.ts?raw";
import v2Gate from "../src/v2/proof/gate.ts?raw";
import { GATE_RULES, buildCanonicalCapture, runGateTwice } from "../src/v2/proof/gate.js";

/** v1 text from the line starting with `from` to the end of the top-level block ending before `until`. */
function slice(src: string, from: string, until: string): string {
  const a = src.indexOf(from);
  const b = src.indexOf(until, a);
  if (a < 0 || b < 0) throw new Error(`slice ${from} … ${until} not found`);
  return src.slice(a, b).trimEnd();
}

const squash = (s: string): string => s.replace(/\s+/g, " ").trim();

describe("the gate is v1's, verbatim", () => {
  it("constants and record types", () => {
    const v1 = slice(v1Main, "const GATE_N = 256;", "let captureSeed");
    expect(v2Gate).toContain(v1);
  });

  it("the simulation, order parameters and fluid probe", () => {
    const v1 = slice(v1Main, "function mulberry32(", "function rowsFromCapture(");
    expect(v1).toContain("function simulateGate(");
    expect(v1).toContain("function fluidProjectionProbe(");
    expect(v2Gate).toContain(v1);
  });

  it("the capture's steps and manifest", () => {
    const steps = slice(v1Main, "  const ordered = simulateGate(captureSeed, 0.0, 2.0);", "  exposeCapture(");
    expect(v2Gate).toContain(steps);
    const manifest = slice(v1Main, "      manifest: {", "    { download: false },");
    // the manifest is re-indented (an object literal instead of a call argument)
    expect(squash(v2Gate)).toContain(squash(manifest).replace(/,$/, ""));
  });
});

describe("the capture", () => {
  it("is deterministic", () => {
    const a = JSON.stringify(buildCanonicalCapture().bundle);
    const b = JSON.stringify(buildCanonicalCapture().bundle);
    expect(a).toBe(b);
  });

  it("passes the gate's predicates", async () => {
    const g = await runGateTwice();
    expect(g.checkpoints).toEqual([...GATE_RULES.checkpoints]);
    expect(g.identical).toBe(true);
    expect(g.finite && g.bounded && g.speedOk && g.noiseResponse && g.fluidImproves).toBe(true);
    expect(g.pass).toBe(true);
  });
});
