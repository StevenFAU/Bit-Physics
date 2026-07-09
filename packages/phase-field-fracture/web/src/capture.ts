// phase-field-fracture — web-gate canonical capture (new_canonical,
// spec-ref § 6.2).
//
// Gate scene: sent-void-96sq-m1 — THE canonical scene (the backend capture
// and the browser gate share one config; heat-equation reduced-tier
// precedent inverted: here the canonical was sized for the browser from the
// start). The loading protocol {u_top, v_top} per substep is computed in
// pure-JS f64 (pff64.loadingSchedule — bit-compatible with the Python
// reference loop) and cast ONCE to f32 into the dynamic-offset uniform
// ring; the GPU never recomputes the protocol. At each checkpoint the four
// state fields {ux, uy, d, h_field} are read back f32 and the diagnostics
// are evaluated in f64. verify.py re-runs the f64 reference LIVE and
// compares per-checkpoint per-field max_abs at the PRE-BURST checkpoints
// against [defaults.phase-field-fracture]; the post-peak burst is gated by
// observables (peak band, E_frac band, crack-path IoU).
//
// Determinism witness: the driver runs the whole page twice; the checkpoint
// byte streams must match exactly (per-cell/per-node passes, no atomics on
// the gated path).

import type {
  CaptureBundle,
  CaptureStepDescriptor,
} from "../../../../common/common-web/src/capture-export.js";
import { field } from "../../../../common/common-web/src/capture-export.js";
import {
  E_VOID,
  K_RES,
  fractureConfig,
  fractureEnergy,
  loadingSchedule,
  maxOf,
  sumKineticEnergy,
} from "./pff64.mjs";
import { FractureGpu, buildMaterial } from "./solver.js";

export const GATE_N = 96;
export const GATE_CAPTURE_INTERVAL = 2000;
export const GATE_DESCRIPTOR = "sent-void-96sq-m1";

export function gateConfig(): ReturnType<typeof fractureConfig> {
  return fractureConfig({ n: GATE_N });
}

/** SENT material field: void slit over half the width at mid-height —
 * matches FractureSolver's notch construction exactly. */
export function sentMaterial(n: number): Float32Array {
  return buildMaterial(n, [
    { kind: "slit", i0: 0, i1: Math.floor(n / 2), j: Math.floor(n / 2), eMult: E_VOID },
  ]);
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

export interface CheckpointFields {
  ux: Float32Array;
  uy: Float32Array;
  d: Float32Array;
  h: Float32Array;
}

export interface GateRun {
  steps: CaptureStepDescriptor[];
  /** sha-256 over the concatenated checkpoint field bytes. */
  trajectorySha: string;
  /** raw checkpoint fields for the PROVE instruments (typed arrays). */
  fieldsAt: Map<number, CheckpointFields>;
  /** (step, reaction) samples for the F-delta overlay. */
  forceCurve: Array<[number, number, number]>; // step, u_applied, reaction
  peak: { reaction: number; uApplied: number };
}

/** One full gate run on a dedicated 96^2 solver. */
export async function runGateScene(
  device: GPUDevice,
  onProgress?: (done: number, total: number) => void,
): Promise<GateRun> {
  const cfg = gateConfig();
  const sched = loadingSchedule(cfg);
  const gpu = new FractureGpu(
    device,
    {
      n: cfg.n, h: cfg.h, dt: cfg.dt, lam: cfg.lam, mu: cfg.mu,
      cDamp: cfg.cDamp, mobility: cfg.mobilityM, kRes: K_RES,
    },
    sentMaterial(cfg.n),
  );
  try {
    gpu.reset(sentMaterial(cfg.n));
    const steps: CaptureStepDescriptor[] = [];
    const fieldsAt = new Map<number, CheckpointFields>();
    const shaChunks: Float32Array[] = [];
    const forceCurve: Array<[number, number, number]> = [];
    const peak = { reaction: -Infinity, uApplied: 0 };

    const checkpoint = async (step: number): Promise<void> => {
      const { ux, uy } = await gpu.readU();
      const { vx, vy } = await gpu.readV();
      const d = await gpu.readD();
      const h = await gpu.readH();
      fieldsAt.set(step, { ux, uy, d, h });
      shaChunks.push(ux, uy, d, h);
      const reaction = await gpu.readReaction();
      const ke = sumKineticEnergy(
        Float64Array.from(vx), Float64Array.from(vy), cfg.h,
      );
      const efrac = fractureEnergy(Float64Array.from(d), cfg.n, cfg.h);
      const diags: Record<string, number> = {
        u_applied: sched.uTop[step] ?? 0,
        reaction,
        ke,
        e_frac: efrac,
        d_max: maxOf(d),
        sim_time: step * Math.fround(cfg.dt),
      };
      steps.push({
        step,
        state: {
          ux: field(ux, [cfg.n + 1, cfg.n + 1], "f32"),
          uy: field(uy, [cfg.n + 1, cfg.n + 1], "f32"),
          d: field(d, [cfg.n, cfg.n], "f32"),
          h_field: field(h, [cfg.n, cfg.n], "f32"),
        },
        diagnostics: diags,
      });
    };

    await checkpoint(0);
    // batch boundaries MUST land exactly on checkpoint steps (readbacks see
    // the state at batch end): 500 | 2000 and the final partial batch ends
    // at stepCount. 500 halves the sync stalls vs 200 for CI's software
    // rasterizer; the F-delta peak sampling at 500-step cadence stays well
    // inside the 2 % peak band (the curve is parabolic-flat near the top).
    const BATCH = 500;
    for (let start = 1; start <= cfg.stepCount; start += BATCH) {
      const end = Math.min(start + BATCH - 1, cfg.stepCount);
      gpu.fillRing(sched.uTop, sched.vTop, start, end - start + 1);
      const enc = device.createCommandEncoder();
      for (let i = start; i <= end; i++) {
        gpu.encodeSubstep(enc, i);
      }
      device.queue.submit([enc.finish()]);
      // reaction sample at batch cadence for the F-delta overlay
      const r = await gpu.readReaction();
      forceCurve.push([end, sched.uTop[end], r]);
      if (r > peak.reaction) {
        peak.reaction = r;
        peak.uApplied = sched.uTop[end];
      }
      if (end % GATE_CAPTURE_INTERVAL === 0 || end === cfg.stepCount) {
        await checkpoint(end);
      }
      onProgress?.(end, cfg.stepCount);
    }

    // the true peak lands BETWEEN checkpoints — report the batch-cadence
    // (500-step) peak on the final checkpoint for the verify.py peak band
    const last = steps[steps.length - 1];
    last.diagnostics.peak_reaction = peak.reaction;
    last.diagnostics.peak_u_applied = peak.uApplied;

    const total = new Float32Array(shaChunks.reduce((a, c) => a + c.length, 0));
    let off = 0;
    for (const c of shaChunks) {
      total.set(c, off);
      off += c.length;
    }
    const trajectorySha = await sha256hex(total);
    return { steps, trajectorySha, fieldsAt, forceCurve, peak };
  } finally {
    gpu.destroy();
  }
}

export function makeBundle(run: GateRun, seed: number, wallSeconds: number): CaptureBundle {
  const cfg = gateConfig();
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: {
        name: "phase-field-fracture",
        category: "fracture",
        variant: "at2-hybrid-miehe-split-gradient-flow-webgpu",
      },
      stack: {
        name: "webgpu-f32",
        version: "0.0.1",
        build_id: "phase-6-phase-field-fracture-web",
      },
      config: {
        tier: "test",
        dims: [cfg.n, cfg.n],
        dtype: "f32",
        seed,
        params: {
          n: cfg.n,
          l_domain: cfg.lDomain,
          e_tilde: cfg.eTilde,
          nu: cfg.nu,
          u_end: cfg.uEnd,
          vload_frac: cfg.vloadFrac,
          t_ramp: cfg.tRamp,
          cfl: cfg.cfl,
          c_damp: cfg.cDamp,
          mobility_m: cfg.mobilityM,
          dt: cfg.dt,
          h: cfg.h,
          notch: "void",
          damage_mode: "gf",
        },
      },
      run: {
        step_count: cfg.stepCount,
        capture_interval: GATE_CAPTURE_INTERVAL,
        wall_clock_seconds: wallSeconds,
        start_utc: "2026-07-09T00:00:00Z",
      },
      payload: {
        format: "hdf5",
        path: `${GATE_DESCRIPTOR}.h5`,
        checksum: "sha256:" + "0".repeat(64),
      },
      determinism: {
        claimed: "bit-exact-same-hw",
        atomic_ops: false,
        subgroup_ops: false,
      },
    },
    steps: run.steps,
  };
}
