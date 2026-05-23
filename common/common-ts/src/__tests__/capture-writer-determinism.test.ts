// Source-level determinism tests for ``CaptureWriter.finalize()`` —
// counterpart of tools/testkit/capture/tests/test_writer_determinism.py
// (sub-phase-capture-determinism-contract Stage 1 deliverable 6).
//
// h5wasm 0.10.1 embeds wall-clock-influenced Unix epoch in every HDF5
// object header (H5O_MTIME_NEW) via emscripten's _emscripten_date_now →
// Date.now(). Per Stage 0 Task 0.3(c) empirical verification, the ONLY
// viable userland shim path is to freeze the global Date.now() for the
// duration of the h5wasm write window — Module._emscripten_date_now is
// NOT accessible via h5wasm-node's exported surface.
//
// These tests defend the source-level fix against regression AND verify
// that no Date.now monkey-patch leaks out of finalize() (R-D5 mitigation
// requirement per charter § 9).

import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CaptureManifest } from "../capture.js";
import { CaptureWriter } from "../capture.js";

function manifestOf(payloadName: string): CaptureManifest {
  return {
    schema_version: "1.0.0",
    sim: { name: "writer-det", category: "continuous-ca", variant: "stub" },
    stack: { name: "ts-node", version: "0.0.1", build_id: "stub" },
    config: { tier: "test", dims: [4], dtype: "f64", seed: 7, params: {} },
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

describe("CaptureWriter source-level determinism", () => {
  let workdir = "";
  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), "cap-writer-det-"));
  });
  afterEach(() => {
    if (workdir !== "") rmSync(workdir, { recursive: true, force: true });
  });

  it("produces byte-identical .h5 across 1.5s wall-clock separation", async () => {
    const dirA = join(workdir, "a");
    const dirB = join(workdir, "b");
    mkdirSync(dirA, { recursive: true });
    mkdirSync(dirB, { recursive: true });

    const writeOnce = async (dir: string): Promise<Buffer> => {
      const writer = new CaptureWriter(manifestOf("payload.h5"), dir);
      writer.addStep(0, { U: new Float64Array([1, 2, 3, 4]) }, { mass: 10 });
      writer.addStep(1, { U: new Float64Array([5, 6, 7, 8]) }, { mass: 26 });
      const manifestPath = await writer.finalize();
      const payloadPath = join(dir, "payload.h5");
      void manifestPath;
      return readFileSync(payloadPath);
    };

    const a = await writeOnce(dirA);
    await new Promise((r) => setTimeout(r, 1500));
    const b = await writeOnce(dirB);

    expect(a.length).toBe(b.length);
    expect(a.equals(b)).toBe(true);
  }, 30000);

  it("does NOT leak Date.now monkey-patch outside finalize()", async () => {
    const beforeNow = Date.now();
    // beforeNow must be a real, current Unix epoch (not the frozen 0).
    expect(beforeNow).toBeGreaterThan(1_000_000_000_000);

    const writer = new CaptureWriter(manifestOf("payload.h5"), workdir);
    writer.addStep(0, { U: new Float64Array([1, 2, 3, 4]) }, { mass: 10 });
    await writer.finalize();

    const afterNow = Date.now();
    // afterNow must also be a real Unix epoch, and ≥ beforeNow (time
    // advances monotonically; finalize() takes non-negative wall-clock).
    expect(afterNow).toBeGreaterThan(1_000_000_000_000);
    expect(afterNow).toBeGreaterThanOrEqual(beforeNow);
  }, 30000);

  it("restores Date.now even if finalize throws mid-write", async () => {
    const beforeNow = Date.now();
    const writer = new CaptureWriter(manifestOf("payload.h5"), workdir);
    // Inject a step with an invalid state field — _writeSteps throws a
    // TypeError because the field is neither Float32Array nor Float64Array.
    writer.addStep(0, { U: [1, 2, 3, 4] as unknown as Float64Array }, {});

    let threw = false;
    try {
      await writer.finalize();
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);

    const afterNow = Date.now();
    expect(afterNow).toBeGreaterThan(1_000_000_000_000);
    expect(afterNow).toBeGreaterThanOrEqual(beforeNow);
  }, 30000);
});
