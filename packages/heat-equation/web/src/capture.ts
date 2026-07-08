// heat-equation — web-gate canonical capture (new_canonical, spec-ref § 13.1).
//
// Gate scene: fourier-multi at the 128^2 web-gate tier (alpha 0.02,
// dt 10/128^2 = 0.8x the von Neumann bound, 512 steps, checkpoints every
// 128) — the schrodinger-smoke reduced-tier precedent keeps the capture
// bundle small while the visible demo runs larger grids. The IC is built in
// pure-JS f64 (heat64.mjs, the backend algorithm), cast once to f32, and
// stepped on TWO dedicated 128^2 GPU solvers — the FTCS stencil path and
// the spectral path whose per-mode multipliers come from the COMMITTED
// f64 decay table (public/heat-gate-decay-f64.bin; spec-ref § 5.2/§ 8 —
// never WGSL exp). At each checkpoint both f32 fields are read back and the
// diagnostics are evaluated in f64 (total heat, L2, pinned-mode amplitudes,
// Parseval). verify.py re-runs the f64 reference LIVE and compares
// per-checkpoint per-field max_abs against the [defaults.heat-equation]
// budget.
//
// Determinism witness: the driver runs the whole page twice; the field byte
// streams must match exactly (pure grid stencil + fixed Stockham order, no
// atomics on the gated path).

import type {
  CaptureBundle,
  CaptureStepDescriptor,
} from "../../../../common/common-web/src/capture-export.js";
import { field } from "../../../../common/common-web/src/capture-export.js";
import {
  continuousEigenvalue,
  l2Norm,
  makeCanonicalIc,
  parsevalRelErr,
  sinsinAmplitude,
  totalHeat,
} from "./heat64.mjs";
import { HeatGpu } from "./solver.js";

export const GATE = {
  n: 128,
  alpha: 0.02,
  dt: 10 / (128 * 128), // 0.8 * von Neumann bound; r_x + r_y = 0.4
  steps: 512,
  captureInterval: 128,
  modes: [
    [1, 1],
    [5, 3],
    [2, 7],
  ] as Array<[number, number]>,
  amplitudes: [0.5, 0.25, 0.125],
  offset: 1.0,
  diagModes: [
    [1, 1],
    [5, 3],
  ] as Array<[number, number]>,
  descriptor: "fourier-multi-128sq-alpha0.02-step512-webgate",
};

export async function fetchGateDecayF64(): Promise<Float64Array> {
  const resp = await fetch("./heat-gate-decay-f64.bin");
  if (!resp.ok) throw new Error(`decay table fetch failed: ${resp.status}`);
  return new Float64Array(await resp.arrayBuffer());
}

export async function sha256hex(data: Float32Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface GateRun {
  steps: CaptureStepDescriptor[];
  /** sha-256 over the concatenated checkpoint field bytes (both paths). */
  trajectorySha: string;
  /** raw checkpoint snapshots for the PROVE instruments. */
  ftcsAt: Map<number, Float32Array>;
  specAt: Map<number, Float32Array>;
  /** worst pinned-mode relative error of the f32 spectral path vs the
   * continuous f64 golden, across checkpoints. */
  worstModeRelErr: number;
}

/** One full gate run on two dedicated 128^2 solvers (FTCS + spectral). */
export async function runGateScene(
  device: GPUDevice,
  decayF64: Float64Array,
): Promise<GateRun> {
  const params = {
    alpha: GATE.alpha,
    dt: GATE.dt,
    bcKind: 0 as const,
    wallValue: 0,
    useMaterial: false,
    sourceScale: 0,
  };
  const decayF32 = Float32Array.from(decayF64);
  const gpuF = new HeatGpu(device, GATE.n, params, decayF32);
  const gpuS = new HeatGpu(device, GATE.n, params, decayF32);
  try {
    const ic64 = makeCanonicalIc(GATE.n);
    const ic32 = Float32Array.from(ic64);
    gpuF.uploadField(ic32);
    gpuS.uploadField(ic32);
    gpuF.uploadSource(new Float32Array(GATE.n * GATE.n));
    gpuS.uploadSource(new Float32Array(GATE.n * GATE.n));

    const steps: CaptureStepDescriptor[] = [];
    const ftcsAt = new Map<number, Float32Array>();
    const specAt = new Map<number, Float32Array>();
    const shaChunks: Float32Array[] = [];
    let worstModeRelErr = 0;

    const checkpoint = async (step: number): Promise<void> => {
      const tf = await gpuF.readField();
      const ts = await gpuS.readField();
      ftcsAt.set(step, tf);
      specAt.set(step, ts);
      shaChunks.push(tf, ts);
      const tf64 = Float64Array.from(tf);
      const ts64 = Float64Array.from(ts);
      const diags: Record<string, number> = {
        total_heat_ftcs: totalHeat(tf64, GATE.n),
        total_heat_spec: totalHeat(ts64, GATE.n),
        l2_ftcs: l2Norm(tf64, GATE.n),
        t_min: tf.reduce((a, b) => Math.min(a, b), Infinity),
        t_max: tf.reduce((a, b) => Math.max(a, b), -Infinity),
        parseval_rel_err: parsevalRelErr(ts64, GATE.n),
        sim_time: step * GATE.dt,
      };
      for (let mi = 0; mi < GATE.diagModes.length; mi++) {
        const [m, k] = GATE.diagModes[mi];
        const ampF = sinsinAmplitude(tf64, GATE.n, m, k);
        const ampS = sinsinAmplitude(ts64, GATE.n, m, k);
        diags[`amp_ftcs_${m}_${k}`] = ampF;
        diags[`amp_spec_${m}_${k}`] = ampS;
        const idx = GATE.modes.findIndex(([a, b]) => a === m && b === k);
        const amp0 = GATE.amplitudes[idx];
        const expect =
          amp0 * Math.exp(GATE.alpha * continuousEigenvalue(GATE.n, m, k) * step * GATE.dt);
        if (step > 0) {
          worstModeRelErr = Math.max(worstModeRelErr, Math.abs(ampS - expect) / Math.abs(expect));
        }
      }
      steps.push({
        step,
        state: {
          t_ftcs: field(tf, [GATE.n, GATE.n], "f32"),
          t_spec: field(ts, [GATE.n, GATE.n], "f32"),
        },
        diagnostics: diags,
      });
    };

    await checkpoint(0);
    for (let i = 1; i <= GATE.steps; i++) {
      const enc = device.createCommandEncoder();
      gpuF.encodeFtcsStep(enc);
      gpuS.encodeSpectralStep(enc);
      device.queue.submit([enc.finish()]);
      if (i % GATE.captureInterval === 0) {
        await checkpoint(i);
      }
    }

    const total = new Float32Array(shaChunks.reduce((a, c) => a + c.length, 0));
    let off = 0;
    for (const c of shaChunks) {
      total.set(c, off);
      off += c.length;
    }
    const trajectorySha = await sha256hex(total);
    return { steps, trajectorySha, ftcsAt, specAt, worstModeRelErr };
  } finally {
    gpuF.destroy();
    gpuS.destroy();
  }
}

export function makeBundle(run: GateRun, seed: number, wallSeconds: number): CaptureBundle {
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: {
        name: "heat-equation",
        category: "volumetric-grid",
        variant: "ftcs-plus-spectral-etd1-webgpu",
      },
      stack: { name: "webgpu-f32", version: "0.0.1", build_id: "phase-6-heat-equation-web" },
      config: {
        tier: "test",
        dims: [GATE.n, GATE.n],
        dtype: "f32",
        seed,
        params: {
          alpha: GATE.alpha,
          dt: GATE.dt,
          dx: 1 / GATE.n,
          n: GATE.n,
          safety: 0.8,
          modes: GATE.modes,
          amplitudes: GATE.amplitudes,
          offset: GATE.offset,
        },
      },
      run: {
        step_count: GATE.steps,
        capture_interval: GATE.captureInterval,
        wall_clock_seconds: wallSeconds,
        start_utc: "2026-07-08T00:00:00Z",
      },
      payload: {
        format: "hdf5",
        path: `${GATE.descriptor}.h5`,
        checksum: "sha256:" + "0".repeat(64),
      },
      determinism: { claimed: "bit-exact-same-hw", atomic_ops: false, subgroup_ops: false },
    },
    steps: run.steps,
  };
}
