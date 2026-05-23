// Capture reader (TypeScript counterpart of the Python `capture.load_capture`).
// Reads the canonical /steps/{N}/state/{field} + /steps/{N}/diagnostics/{check}
// + /metadata layout written by `CaptureWriter` via h5wasm, into a normalized
// in-memory `Capture` record. The reader is the load-bearing surface for the
// content-equivalent determinism contract (spec § 2.5; sub-phase-capture-
// determinism-contract): two captures are determinism-equivalent iff their
// parsed `Capture` records compare equal element-wise. Wall-clock-influenced
// storage-format metadata (HDF5 object-header timestamps, file-system mtime)
// is explicitly NOT part of the `Capture` projection.
//
// Reader output deliberately uses Float64Array for state arrays — h5wasm
// returns ArrayLike<number> and we normalize into a typed array so the diff
// pass can rely on a stable type.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import h5wasmNode from "h5wasm/node";

import type { CaptureManifest } from "../capture.js";

// Per-step record. State + diagnostic field names are sim-defined; the
// reader returns whatever names appear under /steps/{N}/state and
// /steps/{N}/diagnostics, sorted alphabetically for stable diff iteration.
export interface CaptureStep {
  step: number;
  state: Record<string, Float64Array>;
  diagnostics: Record<string, number>;
}

export interface Capture {
  manifest: CaptureManifest;
  steps: CaptureStep[];
}

interface H5Attr {
  value: unknown;
  shape?: number[];
}

interface H5NodeLike {
  keys(): string[];
  attrs: Record<string, H5Attr>;
  // h5wasm returns scalar (0-D) datasets as a plain `number`, and
  // 1-D-and-higher datasets as ArrayLike<number>. We accept the union
  // and normalize at the read site.
  value?: ArrayLike<number> | number;
}

interface H5FileReader {
  keys(): string[];
  get(path: string): H5NodeLike | null;
  close(): void;
}

interface H5WasmAccess {
  ready: Promise<unknown>;
  File: new (path: string, mode: "r") => H5FileReader;
}

function readManifest(manifestPath: string): CaptureManifest {
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest not found at ${manifestPath}`);
  }
  return JSON.parse(readFileSync(manifestPath, "utf8")) as CaptureManifest;
}

function toFloat64Array(
  value: ArrayLike<number> | number | undefined,
  where: string,
): Float64Array {
  if (value === undefined) {
    throw new Error(`empty value at ${where}`);
  }
  if (typeof value === "number") {
    return Float64Array.of(value);
  }
  if (value instanceof Float64Array) {
    return value;
  }
  if (value instanceof Float32Array) {
    return new Float64Array(value);
  }
  return Float64Array.from(value);
}

function scalarFromValue(value: ArrayLike<number> | number | undefined, where: string): number {
  if (value === undefined) {
    throw new Error(`empty diagnostic value at ${where}`);
  }
  // h5wasm returns 0-D scalar datasets as a plain `number`.
  if (typeof value === "number") {
    return value;
  }
  if (value.length === 0) {
    throw new Error(`empty diagnostic value at ${where}`);
  }
  const v = value[0];
  if (v === undefined) throw new Error(`empty diagnostic value at ${where}`);
  return v;
}

function sortedKeys(node: H5NodeLike | null): string[] {
  if (node === null) return [];
  const keys = node.keys();
  return [...keys].sort();
}

/**
 * Read a Capture from its manifest JSON path. Opens the sibling .h5 payload
 * via h5wasm in read-only mode and projects /steps/{N}/state/{field} +
 * /steps/{N}/diagnostics/{check} into a typed `Capture` record. Closes the
 * h5wasm file before returning.
 */
export async function loadCapture(manifestPath: string): Promise<Capture> {
  const manifest = readManifest(manifestPath);
  const payloadPath = resolve(dirname(manifestPath), manifest.payload.path);
  if (!existsSync(payloadPath)) {
    throw new Error(`payload not found at ${payloadPath}`);
  }

  const h5 = h5wasmNode as unknown as H5WasmAccess;
  await h5.ready;
  const file = new h5.File(payloadPath, "r");
  try {
    const stepsGroup = file.get("steps");
    if (stepsGroup === null) {
      throw new Error(`payload ${payloadPath} has no /steps group`);
    }
    const stepKeys = sortedKeys(stepsGroup).sort((a, b) => Number(a) - Number(b));

    const steps: CaptureStep[] = [];
    for (const stepKey of stepKeys) {
      const stepIndex = Number(stepKey);
      if (!Number.isFinite(stepIndex)) {
        throw new Error(`non-numeric step key "${stepKey}" under /steps`);
      }

      const stateGroup = file.get(`steps/${stepKey}/state`);
      const state: Record<string, Float64Array> = {};
      for (const fieldName of sortedKeys(stateGroup)) {
        const dset = file.get(`steps/${stepKey}/state/${fieldName}`);
        state[fieldName] = toFloat64Array(dset?.value, `steps/${stepKey}/state/${fieldName}`);
      }

      const diagGroup = file.get(`steps/${stepKey}/diagnostics`);
      const diagnostics: Record<string, number> = {};
      for (const checkName of sortedKeys(diagGroup)) {
        const dset = file.get(`steps/${stepKey}/diagnostics/${checkName}`);
        diagnostics[checkName] = scalarFromValue(
          dset?.value,
          `steps/${stepKey}/diagnostics/${checkName}`,
        );
      }

      steps.push({ step: stepIndex, state, diagnostics });
    }

    return { manifest, steps };
  } finally {
    file.close();
  }
}
