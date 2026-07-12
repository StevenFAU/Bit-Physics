// lbm-multiphase — web-gate canonical capture (new_canonical) + the live
// analytic instrument gates that make this "the first browser multiphase
// LBM with published analytic validation gates"
// (docs/sim-specs/lattice/lbm-multiphase/spec-ref.md § 6 / § 14).
//
// Five capture stages, all deterministic (fixed dispatch order, no atomics,
// committed ICs, committed psi LUT, zero runtime transcendentals):
//  1. GATE-FLAT-A  — 128x8 Tier A (G=-9, Guo, tau=1), 2000 steps from the
//     committed pre-equilibrated IC; checkpoints {200, 800, 2000} x
//     {rho, ux, uy}. Coexistence densities measured at the final checkpoint
//     against the f64 Maxwell equal-area targets (gate B).
//  2. GATE-DROP-B  — 128^2 Tier B (C-S T/Tc=0.8, Li sigma-forcing, tau=0.8),
//     same checkpoint pattern; spurious-current ceiling measured at the
//     final checkpoint (gate F).
//  3. G-LAPLACE    — four committed equilibrated droplets (r 14/18/22/26),
//     1000 steps each; dp via the bulk EOS on measured densities, sigma from
//     the dp-vs-1/R least-squares slope vs the committed f64 value (gate C).
//  4. G-NOSEP      — committed perturbed IC at G=-5 > G_c: density spread
//     must COLLAPSE (negative control ii, live in CI).
//  5. tau-sweep    — GATE-FLAT-A re-run at tau 0.8/1.2 for 2000 steps:
//     coexistence must not move (Tier A tau-independence, gate B').
//
// verify.py (_gate_lbm_multiphase) re-runs the f64 reference LIVE against
// the same committed ICs and applies [defaults.lbm-multiphase] pointwise.

import type {
  CaptureBundle,
  CaptureStepDescriptor,
} from "../../../../common/common-web/src/capture-export.js";
import { field } from "../../../../common/common-web/src/capture-export.js";
import type { LbmParams } from "./solver.js";
import { LbmGpu, MAX_SUBSTEPS } from "./solver.js";

export const CS2 = 1 / 3;

export interface GateManifest {
  scenes: {
    descriptor: string;
    flat: SceneDef;
    droplet: SceneDef;
    nosep_steps: number;
    coex_steps: number;
    pointwise_checkpoints: { flat: number[]; droplet: number[] };
  };
  assets: {
    psi_lut: { file: string; sha256: string; n: number; rho_max: number };
    ic_flatA: { file: string };
    ic_dropletB: { file: string };
    ic_nosep: { file: string };
    ic_laplaceA: Record<string, string>;
    reference_bins: Record<string, { file: string; sha256: string }>;
  };
  targets: {
    maxwell_tier_a: { rho_v: number; rho_l: number };
    coexistence_measured_f64: { rho_l: number; rho_v: number };
    laplace_sigma_a: number;
    laplace_browser_protocol: { sigma: number; rows: { R: number; dp: number }[]; steps: number };
    spurious_max_u_f64: number;
    nosep_spread_f64: number;
    nosep_G: number;
  };
}

interface SceneDef {
  nx: number;
  ny: number;
  psi_kind: string;
  G: number;
  tau: number;
  forcing: string;
  sigma: number;
  cs_temp: number;
  steps: number;
  checkpoints: number[];
}

export async function sha256hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function fetchManifest(): Promise<GateManifest> {
  const r = await fetch("./lbm-gate-manifest.json");
  if (!r.ok) throw new Error(`manifest fetch failed: ${r.status}`);
  return (await r.json()) as GateManifest;
}

export async function fetchF64(file: string): Promise<Float64Array> {
  const r = await fetch(`./${file}`);
  if (!r.ok) throw new Error(`${file} fetch failed: ${r.status}`);
  return new Float64Array(await r.arrayBuffer());
}

export function paramsOf(def: SceneDef): LbmParams {
  return {
    nx: def.nx,
    ny: def.ny,
    psiKind: def.psi_kind === "cs" ? "cs" : "exp-lut",
    forcing:
      def.forcing === "li-sigma" ? "li-sigma" : def.forcing === "sc-shift" ? "sc-shift" : "guo",
    g: def.G,
    tau: def.tau,
    sigma: def.sigma,
    csTemp: def.cs_temp,
    gravity: [0, 0],
    rhoRef: 1,
  };
}

function drive(gpu: LbmGpu, steps: number): void {
  for (let done = 0; done < steps; ) {
    const n = Math.min(MAX_SUBSTEPS, steps - done);
    const subs = new Array(n).fill({});
    const enc = gpu.device.createCommandEncoder();
    gpu.encodeSubsteps(enc, subs);
    gpu.device.queue.submit([enc.finish()]);
    done += n;
  }
}

/** psi via the committed f64 LUT (JS f64 mirror of reference.psi_from_lut). */
export function psiLutJs(rho: number, lut: Float64Array, rhoMax: number): number {
  const t = (rho * (lut.length - 1)) / rhoMax;
  const i = Math.min(Math.max(Math.floor(t), 0), lut.length - 2);
  const frac = t - i;
  return lut[i] + frac * (lut[i + 1] - lut[i]);
}

export function bulkPressureA(rho: number, g: number, lut: Float64Array, rhoMax: number): number {
  const psi = psiLutJs(rho, lut, rhoMax);
  return rho * CS2 + 0.5 * g * CS2 * psi * psi;
}

async function runSceneOnGpu(
  device: GPUDevice,
  params: LbmParams,
  icF64: Float64Array,
  lutF32: Float32Array,
  checkpoints: number[],
): Promise<Map<number, { rho: Float32Array; ux: Float32Array; uy: Float32Array }>> {
  const gpu = new LbmGpu(device, params, lutF32);
  try {
    gpu.seedFromRho(Float32Array.from(icF64));
    const out = new Map<number, { rho: Float32Array; ux: Float32Array; uy: Float32Array }>();
    let done = 0;
    for (const cp of checkpoints) {
      drive(gpu, cp - done);
      done = cp;
      out.set(cp, await gpu.readMacro());
    }
    return out;
  } finally {
    gpu.destroy();
  }
}

const mean = (a: Float32Array, idx: number[]): number => {
  let s = 0;
  for (const k of idx) s += a[k];
  return s / idx.length;
};

/** flat-scene coexistence probes: liquid = slab center i in [56,72), vapor =
 * outer i in [0,8) + [120,128) — the reference protocol (goldens.py). */
function coexProbes(nx: number, ny: number): { liq: number[]; vap: number[] } {
  const liq: number[] = [];
  const vap: number[] = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      if (i >= 56 && i < 72) liq.push(i * ny + j);
      if (i < 8 || i >= 120) vap.push(i * ny + j);
    }
  }
  return { liq, vap };
}

export interface FullCapture {
  bundle: CaptureBundle;
  summary: Record<string, number>;
}

export async function runFullCapture(
  device: GPUDevice,
  seed: number,
  onStatus?: (m: string) => void,
): Promise<FullCapture> {
  const t0 = performance.now();
  const status = (m: string): void => onStatus?.(m);
  const man = await fetchManifest();
  const lut64 = await fetchF64(man.assets.psi_lut.file);
  const lut32 = Float32Array.from(lut64);
  const rhoMax = man.assets.psi_lut.rho_max;

  // ---- 1. GATE-FLAT-A (+ its committed-reference matched-pair diag) ------
  status("gate: flat Tier-A…");
  const flatDef = man.scenes.flat;
  const flatIc = await fetchF64(man.assets.ic_flatA.file);
  const flat = await runSceneOnGpu(device, paramsOf(flatDef), flatIc, lut32, flatDef.checkpoints);

  // ---- 2. GATE-DROP-B ------------------------------------------------------
  status("gate: droplet Tier-B…");
  const dropDef = man.scenes.droplet;
  const dropIc = await fetchF64(man.assets.ic_dropletB.file);
  const drop = await runSceneOnGpu(device, paramsOf(dropDef), dropIc, lut32, dropDef.checkpoints);

  // matched-pair vs the committed f64 reference trajectories (PROVE display;
  // the CI gate recomputes this from a LIVE f64 rerun)
  // metric (shared with verify.py): per gated checkpoint,
  // max( |d rho| / max|rho_ref| , sqrt(3) * |d u| ) — velocities are
  // normalized by the lattice sound speed c_s = 1/sqrt(3), NEVER by the
  // velocity peak (machine-static scenes have peak ~ 1e-15).
  const SQRT3 = Math.sqrt(3);
  let worstRel = 0;
  for (const [key, caps, def] of [
    ["flat", flat, flatDef],
    ["droplet", drop, dropDef],
  ] as const) {
    const ref = await fetchF64(man.assets.reference_bins[key].file);
    const n2 = def.nx * def.ny;
    const gated = man.scenes.pointwise_checkpoints[key];
    def.checkpoints.forEach((cp, ci) => {
      if (!gated.includes(cp)) return;
      const got = caps.get(cp);
      if (!got) throw new Error(`missing checkpoint ${cp}`);
      const base = ci * 3 * n2;
      let rhoPeak = 0;
      for (let c = 0; c < n2; c++) rhoPeak = Math.max(rhoPeak, Math.abs(ref[base + c]));
      const planes = [got.rho, got.ux, got.uy];
      for (let p = 0; p < 3; p++) {
        for (let c = 0; c < n2; c++) {
          const d = Math.abs(planes[p][c] - ref[base + p * n2 + c]);
          const rel = p === 0 ? d / rhoPeak : d * SQRT3;
          if (rel > worstRel) worstRel = rel;
        }
      }
    });
  }

  // ---- 3. G-LAPLACE ---------------------------------------------------------
  status("gate: Young–Laplace sweep…");
  const lapRows: { R: number; dp: number }[] = [];
  const g = flatDef.G;
  const mid = 0.5 * (man.targets.maxwell_tier_a.rho_v + man.targets.maxwell_tier_a.rho_l);
  const lapSteps = man.targets.laplace_browser_protocol.steps;
  for (const rKey of Object.keys(man.assets.ic_laplaceA)) {
    const ic = await fetchF64(`lbm-gate-ic-laplaceA-r${rKey}.bin`);
    const caps = await runSceneOnGpu(
      device,
      { ...paramsOf(flatDef), nx: 128, ny: 128 },
      ic,
      lut32,
      [lapSteps],
    );
    const m = caps.get(lapSteps);
    if (!m) throw new Error("laplace checkpoint missing");
    // p_in: 8x8 center block; p_out: 6x6 corner block; R from mid-rho area
    let pin = 0;
    let pout = 0;
    let area = 0;
    const ny = 128;
    for (let i = 60; i < 68; i++)
      for (let j = 60; j < 68; j++) pin += bulkPressureA(m.rho[i * ny + j], g, lut64, rhoMax);
    pin /= 64;
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) pout += bulkPressureA(m.rho[i * ny + j], g, lut64, rhoMax);
    pout /= 36;
    for (let c = 0; c < m.rho.length; c++) if (m.rho[c] > mid) area++;
    lapRows.push({ R: Math.sqrt(area / Math.PI), dp: pin - pout });
  }
  lapRows.sort((a, b) => a.R - b.R);
  const xs = lapRows.map((r) => 1 / r.R);
  const ys = lapRows.map((r) => r.dp);
  const n = xs.length;
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxx = xs.reduce((a, b) => a + b * b, 0);
  const sxy = xs.reduce((a, b, i) => a + b * ys[i], 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  const ssTot = ys.reduce((a, b) => a + (b - sy / n) ** 2, 0);
  const ssRes = ys.reduce((a, b, i) => a + (b - (slope * xs[i] + intercept)) ** 2, 0);
  const lapR2 = 1 - ssRes / ssTot;

  // ---- 4. G-NOSEP ------------------------------------------------------------
  status("gate: G > G_c no-separation control…");
  const nosepIc = await fetchF64(man.assets.ic_nosep.file);
  const nosepParams: LbmParams = {
    ...paramsOf(flatDef),
    g: man.targets.nosep_G,
  };
  const nosep = await runSceneOnGpu(
    device,
    nosepParams,
    nosepIc,
    lut32,
    [man.scenes.nosep_steps],
  );
  const nm = nosep.get(man.scenes.nosep_steps);
  if (!nm) throw new Error("nosep checkpoint missing");
  let nMin = Infinity;
  let nMax = -Infinity;
  for (let c = 0; c < nm.rho.length; c++) {
    nMin = Math.min(nMin, nm.rho[c]);
    nMax = Math.max(nMax, nm.rho[c]);
  }

  // ---- 5. coexistence + tau-independence (12000-step protocol) ---------------
  // MEASURED protocol decision: at 2000 steps the rest-reseed transient
  // offsets coexistence 0.44% and makes the tau sweep protocol-noisy
  // (6.7e-3); at 12000 steps the equilibrium values return (0.006%/0.017%
  // off Maxwell, tau-spread 4.8e-5 in both f64 and f32).
  status("gate: coexistence + τ-independence (12k-step flats)…");
  const coexSteps = man.scenes.coex_steps;
  const { liq, vap } = coexProbes(flatDef.nx, flatDef.ny);
  const coexAt: Record<string, { l: number; v: number }> = {};
  for (const tau of [0.8, 1.0, 1.2]) {
    const caps = await runSceneOnGpu(
      device,
      { ...paramsOf(flatDef), tau },
      flatIc,
      lut32,
      [coexSteps],
    );
    const m = caps.get(coexSteps);
    if (!m) throw new Error("coex checkpoint missing");
    coexAt[String(tau)] = { l: mean(m.rho, liq), v: mean(m.rho, vap) };
  }

  // ---- assemble ----------------------------------------------------------------
  const dropFinal = drop.get(dropDef.steps);
  if (!dropFinal) throw new Error("missing final checkpoints");
  const coexL = coexAt["1"].l;
  const coexV = coexAt["1"].v;
  let spurious = 0;
  for (let c = 0; c < dropFinal.ux.length; c++) {
    spurious = Math.max(spurious, Math.abs(dropFinal.ux[c]), Math.abs(dropFinal.uy[c]));
  }
  const tauSpreadL = Math.max(
    Math.abs(coexAt["0.8"].l - coexL),
    Math.abs(coexAt["1.2"].l - coexL),
  );
  const tauSpreadV = Math.max(
    Math.abs(coexAt["0.8"].v - coexV),
    Math.abs(coexAt["1.2"].v - coexV),
  );

  const steps: CaptureStepDescriptor[] = flatDef.checkpoints.map((cp) => {
    const f = flat.get(cp);
    const d = drop.get(cp);
    if (!f || !d) throw new Error(`missing checkpoint ${cp}`);
    return {
      step: cp,
      state: {
        flat_rho: field(f.rho, [flatDef.nx, flatDef.ny], "f32"),
        flat_ux: field(f.ux, [flatDef.nx, flatDef.ny], "f32"),
        flat_uy: field(f.uy, [flatDef.nx, flatDef.ny], "f32"),
        drop_rho: field(d.rho, [dropDef.nx, dropDef.ny], "f32"),
        drop_ux: field(d.ux, [dropDef.nx, dropDef.ny], "f32"),
        drop_uy: field(d.uy, [dropDef.nx, dropDef.ny], "f32"),
      },
      diagnostics: { step_index: cp },
    };
  });
  const last = steps[steps.length - 1];
  const diag = {
    coex_rho_l: coexL,
    coex_rho_v: coexV,
    coex_target_rho_l: man.targets.maxwell_tier_a.rho_l,
    coex_target_rho_v: man.targets.maxwell_tier_a.rho_v,
    tau_spread_rho_l: tauSpreadL,
    tau_spread_rho_v: tauSpreadV,
    laplace_sigma: slope,
    laplace_intercept: intercept,
    laplace_r2: lapR2,
    laplace_sigma_ref: man.targets.laplace_browser_protocol.sigma,
    spurious_max_u: spurious,
    spurious_ref_f64: man.targets.spurious_max_u_f64,
    nosep_spread: nMax - nMin,
    nosep_spread_f64: man.targets.nosep_spread_f64,
    matched_worst_rel: worstRel,
  };
  Object.assign(last.diagnostics, diag);
  const wall = (performance.now() - t0) / 1000;

  const bundle: CaptureBundle = {
    manifest: {
      schema_version: "1.0.0",
      sim: {
        name: "lbm-multiphase",
        category: "lattice",
        variant: "d2q9-pseudopotential-webgpu",
      },
      stack: { name: "webgpu-f32", version: "0.0.1", build_id: "phase-6-lbm-multiphase-web" },
      config: {
        tier: "test",
        dims: [dropDef.nx, dropDef.ny],
        dtype: "f32",
        seed,
        params: {
          descriptor: man.scenes.descriptor,
          flat_G: flatDef.G,
          flat_tau: flatDef.tau,
          drop_T: dropDef.cs_temp,
          drop_tau: dropDef.tau,
          drop_sigma: dropDef.sigma,
          steps: flatDef.steps,
        },
      },
      run: {
        step_count: flatDef.steps,
        capture_interval: 0,
        wall_clock_seconds: wall,
        start_utc: "2026-07-11T00:00:00Z",
      },
      payload: {
        format: "hdf5",
        path: `${man.scenes.descriptor}.h5`,
        checksum: "sha256:" + "0".repeat(64),
      },
      determinism: { claimed: "bit-exact-same-hw", atomic_ops: false, subgroup_ops: false },
    },
    steps,
  };
  return { bundle, summary: diag };
}
