// schrodinger-smoke — web-gate canonical capture (new_canonical, spec-ref § 13.2).
//
// Gate scene: translating-ring at the 32^3 web-gate tier (hbar 0.05,
// dt 1/24, 24 steps, checkpoints every 8) — the pic-flip reduced-tier
// precedent keeps the capture bundle small while the visible demo runs
// larger grids. The IC is built AND settled in pure-JS f64 (isf64.mjs, the
// backend algorithm), cast once to f32, and stepped on a dedicated 32^3
// GPU solver; at each checkpoint the f32 spinor is read back and the
// velocity readout is evaluated in f64 (the backend's
// velocity_cell_centered path). verify.py re-runs the f64 reference LIVE
// and compares per-checkpoint per-field max_abs against the [defaults.isf]
// relative budget.
//
// Determinism witness: the whole run executes TWICE; the psi byte streams
// must hash identically (device-scoped bit-exact — pure grid FFT + gather,
// fixed Stockham order, no atomics in the gated path).

import type {
  CaptureBundle,
  CaptureStepDescriptor,
} from "../../../../common/common-web/src/capture-export.js";
import { field } from "../../../../common/common-web/src/capture-export.js";
import {
  normL2,
  packF32,
  psiFromTheta,
  ringTheta,
  settle,
  unpackF32,
  velocityCellCentered,
} from "./isf64.mjs";
import { IsfGpu } from "./solver.js";

export const GATE = {
  n: 32,
  hbar: 0.05,
  dt: 1 / 24,
  steps: 24,
  captureInterval: 8,
  ringCenter: [0.35, 0.5, 0.5] as [number, number, number],
  ringRadius: 0.22,
  ringThickness: 0.08,
  settleIterations: 8,
  descriptor: "translating-ring-32cube-hbar0.05-step24-webgate",
};

export function buildGateIcF32(): Float32Array {
  const theta = new Float64Array(GATE.n ** 3);
  ringTheta(theta, GATE.n, GATE.ringCenter, GATE.ringRadius, GATE.ringThickness, [1, 0, 0]);
  const psi = psiFromTheta(GATE.n, theta);
  settle(psi, GATE.settleIterations);
  return packF32(psi);
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
  /** sha-256 over the concatenated checkpoint psi bytes (the gated hash). */
  trajectorySha: string;
  /** raw checkpoint psi snapshots (f32) for instrument reuse. */
  psiAt: Map<number, Float32Array>;
  headroom: number;
  maxDiv: number;
}

/** One full gate run on a dedicated 32^3 solver. */
export async function runGateScene(device: GPUDevice): Promise<GateRun> {
  const gpu = new IsfGpu(device, GATE.n, { hbar: GATE.hbar, dt: GATE.dt });
  try {
    gpu.uploadPsi(buildGateIcF32());
    const steps: CaptureStepDescriptor[] = [];
    const psiAt = new Map<number, Float32Array>();
    const shaChunks: Float32Array[] = [];
    let headroom = 0;
    let maxDiv = 0;

    const checkpoint = async (step: number): Promise<void> => {
      const packed = await gpu.readPsi();
      psiAt.set(step, packed);
      shaChunks.push(packed);
      const psi = unpackF32(packed, GATE.n);
      const [u, v, w] = velocityCellCentered(psi, GATE.hbar);
      const shape = [GATE.n, GATE.n, GATE.n];
      steps.push({
        step,
        state: {
          u: field(u, shape, "f64"),
          v: field(v, shape, "f64"),
          w: field(w, shape, "f64"),
        },
        diagnostics: { norm_l2: normL2(psi) },
      });
    };

    await checkpoint(0);
    for (let i = 1; i <= GATE.steps; i++) {
      const enc = device.createCommandEncoder();
      gpu.encodeStep(enc, { skipVelocity: true });
      device.queue.submit([enc.finish()]);
      if (i % GATE.captureInterval === 0) {
        const s = await gpu.readStats();
        headroom = Math.max(headroom, s.maxEta / Math.PI);
        maxDiv = Math.max(maxDiv, s.maxDiv);
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
    return { steps, trajectorySha, psiAt, headroom, maxDiv };
  } finally {
    gpu.destroy();
  }
}

export function makeBundle(run: GateRun, seed: number, wallSeconds: number): CaptureBundle {
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: {
        name: "schrodinger-smoke",
        category: "volumetric-grid",
        variant: "chern-isf-split-step-webgpu",
      },
      stack: { name: "webgpu-f32", version: "0.0.1", build_id: "phase-6-schrodinger-smoke-web" },
      config: {
        tier: "test",
        dims: [GATE.n, GATE.n, GATE.n],
        dtype: "f32",
        seed,
        params: {
          hbar: GATE.hbar,
          dt: GATE.dt,
          dx: 1 / GATE.n,
          n: GATE.n,
          ring_radius: GATE.ringRadius,
          ring_thickness: GATE.ringThickness,
          settle_iterations: GATE.settleIterations,
        },
      },
      run: {
        step_count: GATE.steps,
        capture_interval: GATE.captureInterval,
        wall_clock_seconds: wallSeconds,
        start_utc: "2026-07-05T00:00:00Z",
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
