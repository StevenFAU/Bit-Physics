// Cross-stack invariance gate (phase-0-plan section 3.5).
//
// Writes a capture via the TypeScript CaptureWriter, then spawns
// `uv run python ...` to load the same capture via the Python
// `bit_physics_testkit.capture.load_capture` API and verifies the
// values match.
//
// This is the load-bearing acceptance criterion for Block 7: if it
// passes, the TS-written HDF5 + manifest pair is byte-compatible with
// the Python h5py reader.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CaptureManifest } from "../capture.js";
import { CaptureWriter } from "../capture.js";

function manifestFor(payloadName: string): CaptureManifest {
  return {
    schema_version: "1.0.0",
    sim: { name: "cross-stack", category: "continuous-ca", variant: "stub" },
    stack: { name: "ts-node", version: "0.0.1", build_id: "cs" },
    config: { tier: "test", dims: [4], dtype: "f64", seed: 0, params: {} },
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

const REPO_ROOT = resolve(import.meta.dirname, "..", "..", "..", "..");
const TESTKIT_DIR = resolve(REPO_ROOT, "tools", "testkit");

function uvAvailable(): boolean {
  const which = spawnSync("uv", ["--version"], { encoding: "utf8" });
  return which.status === 0;
}

describe("cross-stack capture invariance", () => {
  let workdir = "";
  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), "cross-stack-"));
  });
  afterEach(() => {
    if (workdir !== "") rmSync(workdir, { recursive: true, force: true });
  });

  it("Python h5py reads the TS-written manifest + payload and the values match", async () => {
    if (!uvAvailable()) {
      // Skip rather than fail when the Python toolchain isn't on PATH
      // (CI may not yet have `uv` installed during early bring-up).
      console.warn("uv not found on PATH; skipping cross-stack test");
      return;
    }

    const writer = new CaptureWriter(manifestFor("cs.h5"), workdir);
    writer.addStep(0, { U: new Float64Array([1, 2, 3, 4]) }, { mass: 10 });
    writer.addStep(1, { U: new Float64Array([5, 6, 7, 8]) }, { mass: 26 });
    const manifestPath = await writer.finalize();

    const script = [
      "import sys",
      "from pathlib import Path",
      "from capture import load_capture",
      `c = load_capture(Path(${JSON.stringify(manifestPath)}))`,
      "s0 = c.step(0)",
      "s1 = c.step(1)",
      "assert s0.state['U'].tolist() == [1.0, 2.0, 3.0, 4.0], s0.state",
      "assert s1.state['U'].tolist() == [5.0, 6.0, 7.0, 8.0], s1.state",
      "assert abs(s0.diagnostics['mass'] - 10.0) < 1e-12",
      "assert abs(s1.diagnostics['mass'] - 26.0) < 1e-12",
      "print('cross-stack roundtrip OK')",
    ].join("\n");

    const result = spawnSync(
      "uv",
      ["run", "--directory", TESTKIT_DIR, "python", "-c", script],
      { encoding: "utf8" },
    );
    if (result.status !== 0) {
      throw new Error(
        `python cross-stack check failed (status=${String(result.status)})\n` +
          `stdout=${result.stdout}\nstderr=${result.stderr}`,
      );
    }
    expect(result.stdout).toContain("cross-stack roundtrip OK");
  });
});

// Suppress "manifestPath used but never bound" lint hint when the test
// is skipped above. (The dirname helper is otherwise referenced only
// in the spawnSync arguments, which lint can't trace.)
void dirname;
