// The extra models' proofs, run on the visitor's GPU from the Prove drawer
// (and by v2-acceptance.mjs). Each check owns a dedicated simulation — its
// own buffers, uniforms and instruments — so nothing on screen can reach it,
// and nothing it does reaches the screen.
//
//   * Model agreement: each model's canonical 64 × 64 dish, run by the live
//     kernel in f32 from the committed starting field, against the committed
//     f64 golden (reaction_diffusion_2d/reference/goldens.py). Score per
//     field: max |Δ| / max |golden|, within the declared budget
//     (tolerance.toml [golden_tolerance.continuous-ca.reaction-diffusion-2d]).
//   * Turing check: the Brusselator's uniform state with 2⁻¹³ noise on a
//     256 × 256 dish; the live FFT instrument's spectrum at two steps gives
//     every ring's growth rate, σ(r) = ln(P₂/P₁)/(2Δt·steps), whose peak must
//     land within the declared band of the dispersion relation's
//     fastest-growing wavenumber.

import { readBuffer } from "@bp/gpu";
import V from "../../generated/verification.json";
import { Instruments } from "../learn/instruments.js";
import type { ModelId } from "../model/models.js";
import { MODELS, canonicalField } from "../model/models.js";
import { growthPeak } from "../model/dispersion.js";
import { runTicks } from "../model/runner.js";
import type { Chemistry } from "../model/sim.js";
import { LiveSim, STEPS_PER_TICK } from "../model/sim.js";
import { assetUrl } from "./gate.js";

export type GoldenSidecar = (typeof V.models.goldens)[number];

export interface FieldScore {
  maxAbs: number;
  maxRef: number;
  /** maxAbs / maxRef */
  rel: number;
}

export interface ModelAgreement {
  descriptor: string;
  model: ModelId;
  steps: number;
  u: FieldScore;
  v: FieldScore;
  worst: number;
  budget: number;
  pass: boolean;
  seconds: number;
}

export interface TuringResult {
  measured: number;
  predicted: number;
  continuum: number;
  rel: number;
  budget: number;
  pass: boolean;
  /** Measured growth rate per ring (−Infinity below rMin). */
  sigma: Float64Array;
  power: [Float32Array, Float32Array];
  seconds: number;
}

function chemFor(model: ModelId, p: { F: number; k: number; c: number; Du: number; Dv: number; dx: number; dt: number }): Chemistry {
  return { model, c: p.c, Du: p.Du, Dv: p.Dv, dt: p.dt, dx: p.dx, F0: p.F, k0: p.k, sweep: null, reveal: null };
}

async function advance(device: GPUDevice, sim: LiveSim, steps: number): Promise<void> {
  if (steps % STEPS_PER_TICK !== 0) throw new Error(`${steps} steps is not a whole number of ticks`);
  let ticks = steps / STEPS_PER_TICK;
  const ctx = { w: sim.w, h: sim.h, seed: sim.seed };
  while (ticks > 0) {
    const n = Math.min(64, ticks);
    const enc = runTicks(n, { device, sim, take: () => [], director: undefined, ctx });
    device.queue.submit([enc.finish()]);
    ticks -= n;
  }
  await device.queue.onSubmittedWorkDone();
}

/** Run one model's canonical dish on this GPU and score it against its golden. */
export async function runModelGolden(device: GPUDevice, g: GoldenSidecar): Promise<ModelAgreement> {
  const t0 = performance.now();
  const model = g.model as ModelId;
  const [w, h] = g.grid as [number, number];
  const field = Float32Array.from(canonicalField(MODELS[model], w, h, g.ic));
  const sim = await LiveSim.create(device, { w, h, periodic: true, kernel: "live", chem: chemFor(model, g.params), seed: g.ic.seed, field });
  try {
    await advance(device, sim, g.steps);
    const got = new Float32Array(await readBuffer(device, sim.state, sim.stateBytes));
    const res = await fetch(assetUrl(`goldens/${g.descriptor}.bin`));
    if (!res.ok) throw new Error(`golden fetch failed: ${res.status}`);
    const ref = new Float64Array(await res.arrayBuffer());
    if (ref.length !== got.length) throw new Error(`golden has ${ref.length} values, the run ${got.length}`);
    const score = (ch: 0 | 1): FieldScore => {
      let maxAbs = 0;
      let maxRef = 0;
      for (let i = ch; i < ref.length; i += 2) {
        maxAbs = Math.max(maxAbs, Math.abs(got[i]! - ref[i]!));
        maxRef = Math.max(maxRef, Math.abs(ref[i]!));
      }
      return { maxAbs, maxRef, rel: maxAbs / maxRef };
    };
    const u = score(0);
    const v = score(1);
    const worst = Math.max(u.rel, v.rel);
    const budget = V.models.tolerance.live_rel[model as keyof typeof V.models.tolerance.live_rel];
    return {
      descriptor: g.descriptor,
      model,
      steps: g.steps,
      u,
      v,
      worst,
      budget,
      pass: Number.isFinite(worst) && worst <= budget,
      seconds: (performance.now() - t0) / 1000,
    };
  } finally {
    sim.destroy();
  }
}

/** The analytic Turing check on this GPU (optionally at another noise seed, for measurement). */
export async function runTuringCheck(device: GPUDevice, seed?: number): Promise<TuringResult> {
  const t0 = performance.now();
  const T = V.models.turing;
  const model = T.model as ModelId;
  const [n] = T.grid as [number, number];
  const ic = { ...T.ic, seed: seed ?? T.ic.seed };
  const field = Float32Array.from(canonicalField(MODELS[model], n, n, ic));
  const sim = await LiveSim.create(device, { w: n, h: n, periodic: true, kernel: "live", chem: chemFor(model, T.params), seed: ic.seed, field });
  const ins = await Instruments.create(device);
  try {
    ins.attach(sim);
    if (ins.windowSize !== n || ins.channel !== T.protocol.channel) throw new Error("the instrument window does not cover the check's dish");
    const spectrum = async (): Promise<Float32Array> => {
      const enc = device.createCommandEncoder({ label: "turing-spectrum" });
      // about the uniform state: the f32 FFT then carries only the perturbation
      if (!ins.recordSpectrum(enc, n / 2, n / 2, MODELS[model].rest[T.protocol.channel]!)) throw new Error("spectrum busy");
      device.queue.submit([enc.finish()]);
      const s = await ins.collectSpectrum();
      if (!s) throw new Error("spectrum readback failed");
      return s.power;
    };
    await advance(device, sim, T.protocol.t1);
    const p1 = await spectrum();
    await advance(device, sim, T.protocol.t2 - T.protocol.t1);
    const p2 = await spectrum();
    const { r, sigma } = growthPeak(p1, p2, T.protocol.t2 - T.protocol.t1, T.params.dt, T.protocol.r_min, T.protocol.fit_half);
    const predicted = T.prediction.r_star;
    const rel = (r - predicted) / predicted;
    const budget = V.models.tolerance.turing_wavenumber_rel;
    return {
      measured: r,
      predicted,
      continuum: T.prediction.r_star_continuum,
      rel,
      budget,
      pass: Number.isFinite(rel) && Math.abs(rel) <= budget,
      sigma,
      power: [p1, p2],
      seconds: (performance.now() - t0) / 1000,
    };
  } finally {
    ins.destroy();
    sim.destroy();
  }
}
