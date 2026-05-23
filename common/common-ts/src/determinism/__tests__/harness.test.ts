// TypeScript determinism harness tests — counterpart of
// tools/testkit/determinism/tests/test_harness.py.
//
// Two stub SimRunners exercise the gate:
//   - deterministicStub: seeds a deterministic PRNG; writes the same
//     Capture every time; passes the gate.
//   - nondeterministicStub: uses Math.random; two captures differ; fails
//     the gate.

import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CaptureManifest } from "../../capture.js";
import { CaptureWriter } from "../../capture.js";
import { diffCaptures, loadCapture, runTwiceAndDiff } from "../index.js";

function manifestOf(payloadName: string, simName: string, seed: number): CaptureManifest {
  return {
    schema_version: "1.0.0",
    sim: { name: simName, category: "continuous-ca", variant: "stub" },
    stack: { name: "ts-node", version: "0.0.1", build_id: "stub" },
    config: { tier: "test", dims: [8], dtype: "f64", seed, params: {} },
    run: {
      step_count: 2,
      capture_interval: 1,
      wall_clock_seconds: 0,
      start_utc: "2026-05-19T00:00:00Z",
    },
    payload: { format: "hdf5", path: payloadName, checksum: "sha256:" + "0".repeat(64) },
    determinism: { claimed: "bit-exact-same-hw", atomic_ops: false, subgroup_ops: false },
  };
}

// LCG-style deterministic seeded PRNG — same seed → same output bits.
function seededField(seed: number, n: number, scale: number): Float64Array {
  const out = new Float64Array(n);
  let state = seed >>> 0;
  for (let i = 0; i < n; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    out[i] = (state / 0x100000000) * scale;
  }
  return out;
}

async function deterministicStub({
  seed,
  outDir,
}: {
  seed: number;
  outDir: string;
}): Promise<string> {
  const field = seededField(seed, 8, 1.0);
  const writer = new CaptureWriter(manifestOf("det-pass.h5", "det-pass-stub", seed), outDir);
  writer.addStep(0, { U: field }, { mass: 1 });
  const field2 = new Float64Array(field);
  for (let i = 0; i < field2.length; i += 1) field2[i] = (field2[i] ?? 0) * 0.5;
  writer.addStep(1, { U: field2 }, { mass: 2 });
  return writer.finalize();
}

async function nondeterministicStub({
  seed,
  outDir,
}: {
  seed: number;
  outDir: string;
}): Promise<string> {
  const field = new Float64Array(8);
  for (let i = 0; i < field.length; i += 1) field[i] = Math.random();
  const writer = new CaptureWriter(manifestOf("det-fail.h5", "det-fail-stub", seed), outDir);
  writer.addStep(0, { U: field }, { mass: 1 });
  writer.addStep(1, { U: new Float64Array(field) }, { mass: 2 });
  return writer.finalize();
}

describe("TypeScript determinism harness", () => {
  let workdir = "";
  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), "det-ts-test-"));
  });
  afterEach(() => {
    if (workdir !== "") rmSync(workdir, { recursive: true, force: true });
  });

  it("deterministic stub passes the gate", async () => {
    const verdict = await runTwiceAndDiff(deterministicStub, {
      seed: 7,
      tmpDir: workdir,
    });
    expect(verdict.contentEquivalent).toBe(true);
    expect(verdict.detail).toBe("captures match exactly");
  });

  it("nondeterministic stub fails the gate", async () => {
    const verdict = await runTwiceAndDiff(nondeterministicStub, {
      seed: 7,
      tmpDir: workdir,
    });
    expect(verdict.contentEquivalent).toBe(false);
    expect(verdict.detail).toContain("max_abs_err");
  });

  it("harness creates two independent run dirs", async () => {
    const sub = join(workdir, "sub");
    await runTwiceAndDiff(deterministicStub, { seed: 42, tmpDir: sub });
    // Both run-a and run-b should exist after the harness ran.
    const { existsSync } = await import("node:fs");
    expect(existsSync(join(sub, "run-a", "det-pass.h5"))).toBe(true);
    expect(existsSync(join(sub, "run-b", "det-pass.h5"))).toBe(true);
  });

  it("loadCapture round-trips state arrays and diagnostics", async () => {
    const a = mkdirSync(join(workdir, "rt"), { recursive: true });
    void a;
    const manifestPath = await deterministicStub({ seed: 99, outDir: join(workdir, "rt") });
    const cap = await loadCapture(manifestPath);
    expect(cap.steps.length).toBe(2);
    expect(cap.steps[0]?.step).toBe(0);
    expect(cap.steps[0]?.state["U"]).toBeInstanceOf(Float64Array);
    expect(cap.steps[0]?.state["U"]?.length).toBe(8);
    expect(cap.steps[0]?.diagnostics["mass"]).toBe(1);
    expect(cap.steps[1]?.diagnostics["mass"]).toBe(2);
  });

  it("diffCaptures flags first-mismatch field path", async () => {
    const dirA = join(workdir, "a");
    const dirB = join(workdir, "b");
    mkdirSync(dirA, { recursive: true });
    mkdirSync(dirB, { recursive: true });
    const manA = await deterministicStub({ seed: 1, outDir: dirA });
    const manB = await deterministicStub({ seed: 2, outDir: dirB });
    const left = await loadCapture(manA);
    const right = await loadCapture(manB);
    const diff = diffCaptures(left, right);
    expect(diff.contentEquivalent).toBe(false);
    expect(diff.mismatchedFields[0]).toMatch(/^steps\/0\/state\/U$/);
  });
});
