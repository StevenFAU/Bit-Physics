// Drive the smoke sim end-to-end: run the FTCS scheme, push every
// step into a CaptureWriter, finalize the HDF5 + manifest pair. Used
// directly by Vitest (`hello-physics.test.ts`) and by the cross-stack
// gate; can also be invoked as `node --experimental-strip-types
// examples/hello-physics/run.ts` for ad-hoc local runs.

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import type { CaptureManifest } from "../../src/capture.js";
import { CaptureWriter } from "../../src/capture.js";
import type { HeatSimParams } from "./heat-equation.js";
import { DEFAULT_PARAMS, runHeatSim } from "./heat-equation.js";

export interface RunOptions {
  params?: Partial<HeatSimParams>;
  steps?: number;
  outDir?: string;
  captureInterval?: number;
  payloadName?: string;
}

export interface RunResult {
  manifestPath: string;
  params: HeatSimParams;
  finalDiagnostics: { mass: number; max: number };
}

export async function runHelloPhysics(options: RunOptions = {}): Promise<RunResult> {
  const params: HeatSimParams = { ...DEFAULT_PARAMS, ...(options.params ?? {}) };
  const steps = options.steps ?? 20;
  const captureInterval = options.captureInterval ?? 5;
  const outDir = resolve(options.outDir ?? "captures/sample");
  const payloadName = options.payloadName ?? "hello-physics.h5";
  mkdirSync(outDir, { recursive: true });

  const sim = runHeatSim(params, steps);

  const manifest: CaptureManifest = {
    schema_version: "1.0.0",
    sim: { name: "hello-physics", category: "continuous-ca", variant: "heat-2d" },
    stack: { name: "ts-node", version: "0.0.1", build_id: "hello-physics" },
    config: {
      tier: "test",
      dims: [params.n, params.n],
      dtype: "f64",
      seed: params.seed,
      params: {
        D: params.D,
        dx: params.dx,
        dt: params.dt,
        sigma0: params.sigma0,
      },
    },
    run: {
      step_count: steps,
      capture_interval: captureInterval,
      wall_clock_seconds: 0,
      start_utc: new Date(0).toISOString(),
    },
    payload: { format: "hdf5", path: payloadName, checksum: "sha256:" + "0".repeat(64) },
    determinism: { claimed: "bit-exact-same-hw", atomic_ops: false, subgroup_ops: false },
  };

  const writer = new CaptureWriter(manifest, outDir);
  for (let stepIdx = 0; stepIdx < sim.states.length; stepIdx += 1) {
    if (stepIdx % captureInterval !== 0 && stepIdx !== sim.states.length - 1) {
      continue;
    }
    writer.addStep(stepIdx, { U: sim.states[stepIdx] as Float64Array }, {});
  }
  const manifestPath = await writer.finalize();
  return {
    manifestPath,
    params,
    finalDiagnostics: sim.diagnostics,
  };
}
