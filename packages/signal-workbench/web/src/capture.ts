// signal-workbench — web-gate canonical capture (new_canonical, spec § 13.1).
//
// Gate scene = the canonical fm-bessel + hann-leak N=4096 frame, both gated
// analysis paths (the heat-equation two-path precedent):
//   path A — coherent Chowning FM, rectangular window: measured f32 GPU FFT
//            vs the exact folded J_n(I) line spectrum;
//   path B — off-bin hann-windowed tone: measured f32 GPU FFT vs the exact
//            shifted-Dirichlet window-DTFT skirt (F*W, spec § 3.2).
// Signals are synthesized in JS f64 (dsp64.mjs — the committed-buffer plan,
// spec § 5.2) and cast once to f32; the GPU does window-multiply + the
// shared poly-trig Stockham FFT. verify.py re-runs the f64 reference LIVE
// and compares per-field max_abs against [defaults.signal-workbench].
//
// Determinism witness: the driver runs the page twice; the field byte
// streams must match exactly (fixed Stockham order, no atomics on the
// gated path).

import type {
  CaptureBundle,
  CaptureStepDescriptor,
} from "../../../../common/common-web/src/capture-export.js";
import { field } from "../../../../common/common-web/src/capture-export.js";
import {
  fmExpectedMag,
  fmSignal,
  parsevalResidual,
  sineSignal,
  toneWindowedMagHalf,
  windowSum,
  windowTaps,
} from "./dsp64.mjs";
import { WorkbenchGpu } from "./solver.js";

export const GATE = {
  n: 4096,
  fmKc: 512,
  fmKm: 37,
  fmIndex: 3.2,
  fmAmplitude: 1.0,
  leakF0Bins: 100.37,
  leakAmplitude: 0.8,
  leakPhase: 0.3,
  leakWindow: "hann",
  descriptor: "fm-bessel-plus-hann-leak-N4096-webgate",
};

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
  /** sha-256 over the concatenated field bytes (both paths). */
  trajectorySha: string;
  fm: { x: Float32Array; re: Float32Array; im: Float32Array };
  leak: { x: Float32Array; re: Float32Array; im: Float32Array };
  /** worst measured-line error vs the exact folded J_n golden, rel of peak. */
  fmLineErrRel: number;
  /** worst measured-skirt error vs the window-DTFT golden, rel of peak. */
  leakSkirtErrRel: number;
  parsevalFm: number;
  parsevalLeak: number;
}

/** One full gate run on a dedicated N=4096 analyzer. */
export async function runGateScene(device: GPUDevice): Promise<GateRun> {
  const gpu = new WorkbenchGpu(device, GATE.n);
  try {
    // --- path A: coherent FM, rectangular window --------------------------
    const xFm64 = fmSignal(GATE.n, GATE.fmKc, GATE.fmKm, GATE.fmIndex, GATE.fmAmplitude);
    const xFm = Float32Array.from(xFm64);
    gpu.uploadSignal(xFm);
    gpu.uploadWindow(new Float32Array(GATE.n).fill(1), GATE.n);
    {
      const enc = device.createCommandEncoder();
      gpu.encodeAnalyze(enc, false);
      device.queue.submit([enc.finish()]);
    }
    const fmSpec = await gpu.readSpectrum();

    // --- path B: off-bin tone under hann ----------------------------------
    const xLeak64 = sineSignal(GATE.n, GATE.leakF0Bins, GATE.leakAmplitude, GATE.leakPhase);
    const xLeak = Float32Array.from(xLeak64);
    const w64 = windowTaps(GATE.leakWindow, GATE.n);
    gpu.uploadSignal(xLeak);
    gpu.uploadWindow(Float32Array.from(w64), windowSum(GATE.leakWindow, GATE.n));
    {
      const enc = device.createCommandEncoder();
      gpu.encodeAnalyze(enc, true);
      device.queue.submit([enc.finish()]);
    }
    const leakSpec = await gpu.readSpectrum();

    // --- diagnostics in f64 (JS numbers) -----------------------------------
    const half = GATE.n >> 1;
    const fmGolden = fmExpectedMag(GATE.n, GATE.fmKc, GATE.fmKm, GATE.fmIndex, GATE.fmAmplitude);
    let fmPeak = 0;
    for (let k = 0; k <= half; k++) fmPeak = Math.max(fmPeak, fmGolden[k]);
    let fmErr = 0;
    for (let k = 0; k <= half; k++) {
      const mag = Math.hypot(fmSpec.re[k], fmSpec.im[k]);
      fmErr = Math.max(fmErr, Math.abs(mag - fmGolden[k]));
    }
    const leakGolden = toneWindowedMagHalf(
      GATE.leakWindow,
      GATE.n,
      GATE.leakF0Bins,
      GATE.leakAmplitude,
      GATE.leakPhase,
    );
    let leakPeak = 0;
    for (let k = 0; k <= half; k++) leakPeak = Math.max(leakPeak, leakGolden[k]);
    let leakErr = 0;
    for (let k = 0; k <= half; k++) {
      const mag = Math.hypot(leakSpec.re[k], leakSpec.im[k]);
      leakErr = Math.max(leakErr, Math.abs(mag - leakGolden[k]));
    }
    const parsevalFm = parsevalResidual(
      Float64Array.from(xFm),
      Float64Array.from(fmSpec.re),
      Float64Array.from(fmSpec.im),
    );
    const parsevalLeak = parsevalResidual(
      Float64Array.from(xLeak).map((v, i) => v * w64[i]),
      Float64Array.from(leakSpec.re),
      Float64Array.from(leakSpec.im),
    );

    const diags: Record<string, number> = {
      parseval_rel_err_fm: parsevalFm,
      parseval_rel_err_leak: parsevalLeak,
      max_line_err_fm: fmErr / fmPeak,
      max_skirt_err_leak: leakErr / leakPeak,
    };
    const steps: CaptureStepDescriptor[] = [
      {
        step: 0,
        state: {
          x_fm: field(xFm, [GATE.n], "f32"),
          X_fm_re: field(fmSpec.re, [GATE.n], "f32"),
          X_fm_im: field(fmSpec.im, [GATE.n], "f32"),
          x_leak: field(xLeak, [GATE.n], "f32"),
          X_leak_re: field(leakSpec.re, [GATE.n], "f32"),
          X_leak_im: field(leakSpec.im, [GATE.n], "f32"),
        },
        diagnostics: diags,
      },
    ];

    const chunks = [xFm, fmSpec.re, fmSpec.im, xLeak, leakSpec.re, leakSpec.im];
    const total = new Float32Array(chunks.reduce((a, c) => a + c.length, 0));
    let off = 0;
    for (const c of chunks) {
      total.set(c, off);
      off += c.length;
    }
    const trajectorySha = await sha256hex(total);
    return {
      steps,
      trajectorySha,
      fm: { x: xFm, re: fmSpec.re, im: fmSpec.im },
      leak: { x: xLeak, re: leakSpec.re, im: leakSpec.im },
      fmLineErrRel: fmErr / fmPeak,
      leakSkirtErrRel: leakErr / leakPeak,
      parsevalFm,
      parsevalLeak,
    };
  } finally {
    gpu.destroy();
  }
}

export function makeBundle(run: GateRun, seed: number, wallSeconds: number): CaptureBundle {
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: {
        name: "signal-workbench",
        category: "signal-processing",
        variant: "fm-bessel-plus-window-leakage-webgpu",
      },
      stack: { name: "webgpu-f32", version: "0.0.1", build_id: "phase-6-signal-workbench-web" },
      config: {
        tier: "test",
        dims: [GATE.n],
        dtype: "f32",
        seed,
        params: {
          n: GATE.n,
          fs: 48000,
          fm_kc: GATE.fmKc,
          fm_km: GATE.fmKm,
          fm_index: GATE.fmIndex,
          fm_amplitude: GATE.fmAmplitude,
          leak_f0_bins: GATE.leakF0Bins,
          leak_amplitude: GATE.leakAmplitude,
          leak_phase: GATE.leakPhase,
          leak_window: GATE.leakWindow,
        },
      },
      run: {
        step_count: 1,
        capture_interval: 1,
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
