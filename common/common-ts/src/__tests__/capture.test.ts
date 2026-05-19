// CaptureWriter HDF5 layout + manifest tests. Spec section 2.7 layout
// is enforced by re-reading the file with h5wasm and walking the
// expected groups + datasets.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import h5wasmNode from "h5wasm/node";

import type { CaptureManifest } from "../capture.js";
import { CaptureWriter } from "../capture.js";

function manifestOf(payloadName: string, seed = 7): CaptureManifest {
  return {
    schema_version: "1.0.0",
    sim: { name: "test-sim", category: "continuous-ca", variant: "stub" },
    stack: { name: "ts-node", version: "0.0.1", build_id: "stub" },
    config: { tier: "test", dims: [4], dtype: "f64", seed, params: {} },
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

describe("CaptureWriter", () => {
  let workdir = "";
  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), "common-ts-test-"));
  });
  afterEach(() => {
    if (workdir !== "" && existsSync(workdir)) rmSync(workdir, { recursive: true, force: true });
  });

  it("writes manifest JSON and HDF5 payload at the configured names", async () => {
    const writer = new CaptureWriter(manifestOf("cap.h5"), workdir);
    writer.addStep(0, { U: new Float64Array([1, 2, 3, 4]) }, { mass: 10 });
    writer.addStep(1, { U: new Float64Array([2, 3, 4, 5]) }, { mass: 14 });
    const manifestPath = await writer.finalize();

    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(resolve(dirname(manifestPath), "cap.h5"))).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as CaptureManifest;
    expect(manifest.payload.checksum.startsWith("sha256:")).toBe(true);
    expect(manifest.payload.checksum.length).toBe("sha256:".length + 64);
  });

  it("HDF5 payload exposes the canonical /steps/{N}/state and /metadata layout", async () => {
    const writer = new CaptureWriter(manifestOf("cap.h5"), workdir);
    writer.addStep(0, { U: new Float64Array([1, 2, 3, 4]) }, { mass: 10 });
    writer.addStep(1, { U: new Float64Array([5, 6, 7, 8]) }, { mass: 26 });
    const manifestPath = await writer.finalize();
    const payloadPath = resolve(dirname(manifestPath), "cap.h5");

    interface H5Attr {
      value: unknown;
      shape: number[];
      dtype: unknown;
    }
    interface H5File {
      keys(): string[];
      get(path: string): {
        keys(): string[];
        attrs: Record<string, H5Attr>;
        value?: ArrayLike<number>;
      } | null;
      close(): void;
    }
    interface H5WasmAccess {
      ready: Promise<unknown>;
      File: new (path: string, mode: "r") => H5File;
    }
    const h5 = h5wasmNode as unknown as H5WasmAccess;
    await h5.ready;
    const file = new h5.File(payloadPath, "r");
    try {
      expect(file.keys()).toEqual(expect.arrayContaining(["steps", "metadata"]));
      const stepsGroup = file.get("steps");
      expect(stepsGroup).not.toBeNull();
      expect(stepsGroup?.keys()).toEqual(expect.arrayContaining(["0", "1"]));

      const stateGroup = file.get("steps/0/state");
      expect(stateGroup?.keys()).toEqual(["U"]);
      const dset = file.get("steps/0/state/U");
      expect(Array.from(dset?.value ?? [])).toEqual([1, 2, 3, 4]);

      const meta = file.get("metadata");
      // h5wasm exposes attributes as `{value, shape, dtype}` objects.
      const schemaAttr = meta?.attrs["schema_version"] as { value?: string };
      expect(schemaAttr?.value).toBe("1.0.0");
      const simNameAttr = meta?.attrs["sim_name"] as { value?: string };
      expect(simNameAttr?.value).toBe("test-sim");
    } finally {
      file.close();
    }
  });

  it("rejects non-float TypedArrays", async () => {
    const writer = new CaptureWriter(manifestOf("cap.h5"), workdir);
    // @ts-expect-error — Int32Array is deliberately wrong; the writer enforces.
    writer.addStep(0, { U: new Int32Array([1, 2, 3, 4]) });
    await expect(writer.finalize()).rejects.toThrow(/Float32Array or Float64Array/);
  });
});
