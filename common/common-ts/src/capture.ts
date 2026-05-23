// h5wasm-backed CaptureWriter. Writes the canonical
// `/steps/{N}/state/{field}` + `/steps/{N}/diagnostics/{check}` +
// `/metadata/` HDF5 layout (spec section 2.7) plus the matching
// manifest JSON. The HDF5 payload is byte-compatible with Block 1's
// h5py reader; the cross-stack round-trip test under
// `src/__tests__/cross-stack.test.ts` proves this end-to-end.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import h5wasmNode from "h5wasm/node";

export interface CaptureManifest {
  schema_version: string;
  sim: { name: string; category: string; variant: string };
  stack: { name: string; version: string; build_id: string };
  config: {
    tier: string;
    dims: number[];
    dtype: "f32" | "f64";
    seed: number;
    params: Record<string, unknown>;
  };
  run: {
    step_count: number;
    capture_interval: number;
    wall_clock_seconds: number;
    start_utc: string;
  };
  payload: { format: "hdf5"; path: string; checksum: string };
  determinism: {
    claimed: "bit-exact-same-hw" | "epsilon" | "non-deterministic";
    atomic_ops: boolean;
    subgroup_ops: boolean;
  };
}

interface StepRecord {
  step: number;
  state: Record<string, Float32Array | Float64Array>;
  diagnostics: Record<string, number>;
}

// h5wasm-native dtype codes. NumPy's `<f8` / `<f4` strings silently map
// to float32 in h5wasm 0.10.1 (see preflight/README.md).
const H5_DTYPE = { f32: "<f", f64: "<d" } as const;

interface H5FileLike {
  create_group(path: string): H5GroupLike;
  get(path: string): H5GroupLike;
  flush(): void;
  close(): void;
}
interface H5GroupLike {
  create_group(path: string): H5GroupLike;
  create_dataset(spec: {
    name: string;
    data: ArrayLike<number>;
    shape: number[];
    dtype: string;
  }): void;
  create_attribute(
    name: string,
    value: unknown,
    shape?: number[] | null,
    dtype?: string,
  ): void;
}

interface H5WasmReady {
  ready: Promise<unknown>;
  File: new (path: string, mode: "r" | "w" | "r+") => H5FileLike;
}

export class CaptureWriter {
  private readonly _outDir: string;
  private readonly _manifest: CaptureManifest;
  private readonly _steps: StepRecord[] = [];

  constructor(manifest: CaptureManifest, outDir: string) {
    this._manifest = structuredClone(manifest);
    this._outDir = resolve(outDir);
  }

  addStep(
    step: number,
    state: Record<string, Float32Array | Float64Array>,
    diagnostics: Record<string, number> = {},
  ): void {
    this._steps.push({ step, state, diagnostics });
  }

  /** Write the HDF5 payload + JSON manifest. Returns the manifest path. */
  async finalize(): Promise<string> {
    mkdirSync(this._outDir, { recursive: true });
    const payloadPath = resolve(this._outDir, this._manifest.payload.path);
    mkdirSync(dirname(payloadPath), { recursive: true });

    const h5wasm = h5wasmNode as unknown as H5WasmReady;
    await h5wasm.ready;

    // Defense-in-depth determinism (sub-phase-capture-determinism-contract):
    // h5wasm 0.10.1's bundled HDF5 library does NOT expose
    // H5Pset_obj_track_times at the WASM-symbol level — Stage 0 Task 0.3(c)
    // empirical verification confirmed Module._emscripten_date_now is not
    // accessible via h5wasm-node's exported surface. The ONLY viable
    // userland shim path is to freeze the global ``Date.now`` for the
    // duration of the h5wasm write window (emscripten's
    // ``_emscripten_date_now`` closes over the host ``Date.now``).
    //
    // The harness-based determinism contract makes this non-load-bearing —
    // the harness compares parsed Capture arrays, not raw file bytes —
    // but suppressing the variance at the source eliminates the latent
    // flake mechanically for any downstream consumer that does compare
    // bytes (e.g., ``payload.checksum`` round-tripping).
    //
    // CRITICAL: the patch is scoped to this finalize() call. Concurrent
    // callers in the same Node process must continue to see normal
    // ``Date.now()`` behavior after finalize() returns. The save / replace
    // / restore is wrapped in try/finally so that an exception in the
    // h5wasm write path still restores the host ``Date.now``.
    const FROZEN_EPOCH_MS = 0;
    const realDateNow = globalThis.Date.now;
    globalThis.Date.now = () => FROZEN_EPOCH_MS;
    try {
      const file = new h5wasm.File(payloadPath, "w");
      try {
        this._writeSteps(file);
        this._writeMetadata(file);
      } finally {
        file.flush();
        file.close();
      }
    } finally {
      globalThis.Date.now = realDateNow;
    }

    const checksum = "sha256:" + sha256OfFile(payloadPath);
    const finalManifest: CaptureManifest = {
      ...this._manifest,
      payload: {
        ...this._manifest.payload,
        path: this._manifest.payload.path,
        checksum,
      },
    };
    const manifestPath = payloadPath.replace(/\.h5$/, ".json");
    writeFileSync(manifestPath, JSON.stringify(finalManifest, null, 2) + "\n", "utf8");
    return manifestPath;
  }

  private _writeSteps(file: H5FileLike): void {
    file.create_group("steps");
    const dtype = H5_DTYPE[this._manifest.config.dtype];
    for (const step of this._steps) {
      const stepKey = `steps/${step.step.toString()}`;
      file.get("steps").create_group(step.step.toString());
      file.get(stepKey).create_group("state");
      file.get(stepKey).create_group("diagnostics");
      for (const [fieldName, arr] of Object.entries(step.state)) {
        if (!isFloatArray(arr)) {
          throw new TypeError(
            `state field "${fieldName}" must be Float32Array or Float64Array; ` +
              `got ${(arr as object).constructor.name}`,
          );
        }
        const shape = inferShape(arr, this._manifest.config.dims);
        file.get(`${stepKey}/state`).create_dataset({
          name: fieldName,
          data: arr,
          shape,
          dtype,
        });
      }
      for (const [diagName, value] of Object.entries(step.diagnostics)) {
        file.get(`${stepKey}/diagnostics`).create_dataset({
          name: diagName,
          data: new Float64Array([value]),
          shape: [],
          dtype: H5_DTYPE.f64,
        });
      }
    }
  }

  private _writeMetadata(file: H5FileLike): void {
    file.create_group("metadata");
    const m = this._manifest;
    const meta = file.get("metadata");
    meta.create_attribute("schema_version", m.schema_version);
    meta.create_attribute("sim_name", m.sim.name);
    meta.create_attribute("sim_category", m.sim.category);
    meta.create_attribute("sim_variant", m.sim.variant);
    meta.create_attribute("stack_name", m.stack.name);
    // h5wasm cannot infer the dtype for a bare numeric attribute (it
    // throws "unguessable type for data" on BigInt and plain numbers
    // alike), so we pass shape + dtype explicitly. `<i` is int32 per
    // h5wasm's dtype table — adequate for seed values, and h5py reads
    // it back as a numpy int32 without ceremony.
    meta.create_attribute("seed", [m.config.seed], [1], "<i");
  }
}

function isFloatArray(value: unknown): value is Float32Array | Float64Array {
  return value instanceof Float32Array || value instanceof Float64Array;
}

function inferShape(
  arr: Float32Array | Float64Array,
  manifestDims: number[],
): number[] {
  const declaredTotal = manifestDims.reduce((acc, n) => acc * n, 1);
  if (declaredTotal === arr.length && manifestDims.length > 0) {
    return [...manifestDims];
  }
  return [arr.length];
}

function sha256OfFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function manifestPathFor(payloadPath: string): string {
  return payloadPath.replace(/\.h5$/, ".json");
}

export function readManifestSync(path: string): CaptureManifest {
  if (!existsSync(path)) {
    throw new Error(`manifest not found at ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as CaptureManifest;
}
