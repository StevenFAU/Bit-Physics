#!/usr/bin/env node
// Phase 0 Block 7 deliverable 0: h5wasm round-trip preflight.
//
// Writes a tiny HDF5 file with a single 4-element float dataset at
// /test/data; the companion h5wasm-check.py reads it via h5py and
// confirms the values round-trip. If h5wasm cannot install, build, or
// round-trip, the block must REFUTE and surface to the user.

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import h5wasm from "h5wasm/node";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "out");
const outFile = resolve(outDir, "preflight.h5");

if (existsSync(outFile)) {
  rmSync(outFile);
}
mkdirSync(outDir, { recursive: true });

await h5wasm.ready;
const { File } = h5wasm;

const file = new File(outFile, "w");
try {
  const data = new Float64Array([1.5, -2.25, 3.125, 0.0]);
  file.create_group("test");
  file.get("test").create_dataset({
    name: "data",
    data,
    shape: [data.length],
    // h5wasm dtype codes: `<d` = float64, `<f` = float32 (h5wasm
    // README.md lines 254 + 263). The `<f8` form numpy uses is not
    // recognized by h5wasm and silently maps to float32.
    dtype: "<d",
  });
} finally {
  file.flush();
  file.close();
}

console.log(`wrote ${outFile}`);
console.log("values: [1.5, -2.25, 3.125, 0.0]");
