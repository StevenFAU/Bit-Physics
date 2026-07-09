// fdtd-optics — web-gate canonical capture (new_canonical) + the analytic
// instrument runs (G-fresnel, G-mie2d) that make this "the first browser
// FDTD with published, reproducible analytic validation gates"
// (docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md § 6 / § 14).
//
// Three capture stages, all deterministic (fixed dispatch order, no atomics):
//  1. GATE — the committed canonical: 128^2 TMz, TF/SF Ricker + dielectric
//     cylinder, PEC box, 512 steps, checkpoints {128,256,384,512} x
//     {Ez,Hx,Hy}. verify.py compares pointwise against the committed
//     Python-f64 .bin within [defaults.fdtd-optics]; the browser ALSO
//     re-runs the JS-f64 reference live (matched-pair diagnostics).
//  2. G-FRESNEL — 1500x8 periodic-y strip, CPML x-ends, soft line-source
//     Ricker, air->glass (n=1.5): two-run subtraction at a probe column,
//     R = sum(refl^2)/sum(inc^2) vs the exact 0.04 (frequency-independent
//     at normal incidence, so the broadband energy ratio is exact physics).
//  3. G-MIE2D — 256^2 TF/SF + r=16 eps=2.25 cylinder, CPML all sides:
//     scattered-field box flux via 2-frequency line DFT, empty-run incident
//     normalization (Meep's two-run discipline), Q_sca vs the committed
//     Bohren-Huffman cylinder table at x = 3 and x = 5 (TM).
//
// All time-dependent source/DFT values are computed here in JS f64 and fed
// per substep through the dynamic-offset uniform ring (§ 9 trig rule).

import type {
  CaptureBundle,
  CaptureStepDescriptor,
} from "../../../../common/common-web/src/capture-export.js";
import { field } from "../../../../common/common-web/src/capture-export.js";
import { GATE64, maxAbs, maxAbsDiff, ricker, runGate64 } from "./fdtd64.mjs";
import type { SubstepU } from "./solver.js";
import { FdtdGpu, MAX_SUBSTEPS, buildPmlRows, vacuumMaterials } from "./solver.js";

export const GATE = {
  ...GATE64,
  descriptor: "tfsf-cyl128-eps2.25-step512",
  referenceBin: "./fdtd-gate-tfsf-cyl128-step512.bin",
};

// Mie instrument constants (committed-table anchors: TM, m = 1.5).
export const MIE = {
  n: 256,
  r: 16,
  epsCyl: 2.25,
  tfsf: { ia: 60, ib: 196, ja: 60, jb: 196, na: 1200 },
  monitorScatter: { mia: 30, mib: 226, mja: 30, mjb: 226 },
  monitorIncident: { mia: 100, mib: 156, mja: 70, mjb: 186 },
  t0: 80,
  tau: 18,
  steps: 1600,
  pmlN: 12,
  // x = 2*pi*r/lambda -> omega = 2*pi*Sc/lambda per step
  xTargets: [3, 5],
  qGolden: [3.856329, 2.833381], // committed cylinder table, TM m=1.5
};

export const FRESNEL = {
  nx: 1500,
  ny: 8,
  srcI: 60,
  probeI: 500,
  ifaceI: 750,
  epsGlass: 2.25,
  t0: 240,
  tau: 60,
  steps: 2600,
  pmlN: 12,
  rExact: 0.04,
};

const SC = GATE64.sc;

export async function sha256hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function emptySub(t: number): SubstepU {
  return {
    t,
    srcVal: 0,
    dftCos: 0,
    dftSin: 0,
    monTrig: [0, 0, 0, 0],
    probeSlot: 0,
    sources: [],
  };
}

/** Drive `steps` substeps in MAX_SUBSTEPS chunks (one submit per chunk —
 * each chunk's uniform ring must be flushed before the next is packed). */
function drive(
  gpu: FdtdGpu,
  steps: number,
  make: (t: number) => SubstepU,
  opts: { phasor?: boolean; monitor?: boolean; probe?: boolean } = {},
): void {
  for (let base = 0; base < steps; base += MAX_SUBSTEPS) {
    const count = Math.min(MAX_SUBSTEPS, steps - base);
    const subs: SubstepU[] = [];
    for (let k = 0; k < count; k++) subs.push(make(base + k));
    const enc = gpu.device.createCommandEncoder();
    gpu.encodeSubsteps(enc, subs, opts);
    gpu.device.queue.submit([enc.finish()]);
  }
}

// ---------------------------------------------------------------- 1. GATE

export interface GateRun {
  steps: CaptureStepDescriptor[];
  /** sha-256 over the concatenated checkpoint field bytes (ez,hx,hy). */
  trajectorySha: string;
  ezAt: Map<number, Float32Array>;
  /** worst per-checkpoint max_abs(f32-f64)/peak vs the LIVE JS-f64 rerun. */
  worstMatchedRel: number;
}

export function gateMaterials(): { mat: Float32Array; mat2: Float32Array } {
  const g = GATE64;
  const { mat, mat2 } = vacuumMaterials(g.n, g.n);
  for (let i = 0; i < g.n; i++) {
    for (let j = 0; j < g.n; j++) {
      const dx = i - g.cx;
      const dy = j - g.cy;
      if (dx * dx + dy * dy <= g.r * g.r) mat[(i * g.n + j) * 4] = g.epsCyl;
    }
  }
  return { mat, mat2 };
}

/** Fetch the committed Python-f64 Ricker source trace (the gate signature —
 * committed data, so JS/Python/WGSL all drive from the SAME f64 values and
 * the JS-f64 mirror stays bit-exact vs the committed reference). */
export async function fetchRickerTrace(): Promise<Float64Array> {
  const resp = await fetch("./fdtd-gate-ricker-f64.bin");
  if (!resp.ok) throw new Error(`ricker trace fetch failed: ${resp.status}`);
  return new Float64Array(await resp.arrayBuffer());
}

export async function runGateScene(device: GPUDevice): Promise<GateRun> {
  const g = GATE64;
  const srcTrace = await fetchRickerTrace();
  const gpu = new FdtdGpu(
    device,
    {
      nx: g.n,
      ny: g.n,
      sc: g.sc,
      periodicY: false,
      tfsf: { ia: g.ia, ib: g.ib, ja: g.ja, jb: g.jb, na: g.na },
      monitor: null,
      probeIdx: 0,
    },
    buildPmlRows(g.n, g.n, g.sc, { n: 0, x0: false, x1: false, y0: false, y1: false }),
  );
  try {
    const m = gateMaterials();
    gpu.uploadMaterials(m.mat, m.mat2);
    gpu.resetState();

    const ref = runGate64(GATE64, null, srcTrace); // live f64 matched-pair
    const steps: CaptureStepDescriptor[] = [];
    const ezAt = new Map<number, Float32Array>();
    const chunks: Uint8Array[] = [];
    let worst = 0;

    let done = 0;
    for (const cp of g.checkpoints) {
      const base = done;
      drive(gpu, cp - base, (t) => ({
        ...emptySub(base + t),
        srcVal: srcTrace[base + t],
      }));
      done = cp;
      const ez = await gpu.readField("ez");
      const hxF = await gpu.readField("hx");
      const hyF = await gpu.readField("hy");
      ezAt.set(cp, ez);
      chunks.push(
        new Uint8Array(ez.buffer.slice(0)),
        new Uint8Array(hxF.buffer.slice(0)),
        new Uint8Array(hyF.buffer.slice(0)),
      );
      const r = ref.get(cp);
      if (!r) throw new Error(`missing f64 checkpoint ${cp}`);
      const peak = maxAbs(r.ez);
      const rel =
        Math.max(
          maxAbsDiff(Float64Array.from(ez), r.ez),
          maxAbsDiff(Float64Array.from(hxF), r.hx),
          maxAbsDiff(Float64Array.from(hyF), r.hy),
        ) / peak;
      worst = Math.max(worst, rel);
      steps.push({
        step: cp,
        state: {
          ez: field(ez, [g.n, g.n], "f32"),
          hx: field(hxF, [g.n, g.n], "f32"),
          hy: field(hyF, [g.n, g.n], "f32"),
        },
        diagnostics: {
          peak_abs_ez: peak,
          matched_rel_err: rel,
          sim_time: cp * g.sc,
        },
      });
    }
    const total = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
    let off = 0;
    for (const c of chunks) {
      total.set(c, off);
      off += c.length;
    }
    return { steps, trajectorySha: await sha256hex(total), ezAt, worstMatchedRel: worst };
  } finally {
    gpu.destroy();
  }
}

// ------------------------------------------------------------ 2. G-FRESNEL

export interface FresnelResult {
  rMeasured: number;
  rExact: number;
  relErr: number;
}

async function fresnelProbeTrace(device: GPUDevice, withGlass: boolean): Promise<Float32Array> {
  const f = FRESNEL;
  const gpu = new FdtdGpu(
    device,
    {
      nx: f.nx,
      ny: f.ny,
      sc: SC,
      periodicY: true,
      tfsf: null,
      monitor: null,
      probeIdx: f.probeI * f.ny,
    },
    buildPmlRows(f.nx, f.ny, SC, { n: f.pmlN, x0: true, x1: true, y0: false, y1: false }),
  );
  try {
    const { mat, mat2 } = vacuumMaterials(f.nx, f.ny);
    if (withGlass) {
      for (let i = f.ifaceI; i < f.nx; i++) {
        for (let j = 0; j < f.ny; j++) mat[(i * f.ny + j) * 4] = f.epsGlass;
      }
    }
    gpu.uploadMaterials(mat, mat2);
    gpu.resetState();
    drive(
      gpu,
      f.steps,
      (t) => {
        const v = ricker(t, f.t0, f.tau);
        const sources = [];
        for (let j = 0; j < f.ny; j++) sources.push({ i: f.srcI, j, value: v, on: true });
        return { ...emptySub(t), probeSlot: t, sources };
      },
      { probe: true },
    );
    return (await gpu.readProbe()).slice(0, f.steps);
  } finally {
    gpu.destroy();
  }
}

export async function runFresnelGate(device: GPUDevice): Promise<FresnelResult> {
  const inc = await fresnelProbeTrace(device, false);
  const tot = await fresnelProbeTrace(device, true);
  let num = 0;
  let den = 0;
  for (let t = 0; t < inc.length; t++) {
    const r = tot[t] - inc[t];
    num += r * r;
    den += inc[t] * inc[t];
  }
  const rMeasured = num / den;
  return {
    rMeasured,
    rExact: FRESNEL.rExact,
    relErr: Math.abs(rMeasured - FRESNEL.rExact) / FRESNEL.rExact,
  };
}

// ------------------------------------------------------------- 3. G-MIE2D

export interface MieResult {
  /** per target x: measured Q_sca, golden Q_sca, relative error. */
  x: number[];
  qMeasured: number[];
  qGolden: number[];
  relErr: number[];
}

interface FluxSpec {
  box: { mia: number; mib: number; mja: number; mjb: number };
  /** net outward flux per frequency (f64). */
  flux: [number, number];
  /** left-line inward flux per unit length per frequency (normalization). */
  leftPerLen: [number, number];
}

function mieOmega(x: number): number {
  // x = 2*pi*r/lambda; omega per step = 2*pi*Sc/lambda = x*Sc/r
  return (x * SC) / MIE.r;
}

async function mieFlux(device: GPUDevice, withCylinder: boolean, box: FluxSpec["box"]): Promise<FluxSpec> {
  const m = MIE;
  const gpu = new FdtdGpu(
    device,
    {
      nx: m.n,
      ny: m.n,
      sc: SC,
      periodicY: false,
      tfsf: m.tfsf,
      monitor: box,
      probeIdx: 0,
    },
    buildPmlRows(m.n, m.n, SC, { n: m.pmlN, x0: true, x1: true, y0: true, y1: true }),
  );
  try {
    const { mat, mat2 } = vacuumMaterials(m.n, m.n);
    if (withCylinder) {
      const c = m.n / 2;
      for (let i = 0; i < m.n; i++) {
        for (let j = 0; j < m.n; j++) {
          const dx = i - c;
          const dy = j - c;
          if (dx * dx + dy * dy <= m.r * m.r) mat[(i * m.n + j) * 4] = m.epsCyl;
        }
      }
    }
    gpu.uploadMaterials(mat, mat2);
    gpu.resetState();
    const w0 = mieOmega(m.xTargets[0]);
    const w1 = mieOmega(m.xTargets[1]);
    drive(
      gpu,
      m.steps,
      (t) => ({
        ...emptySub(t),
        srcVal: ricker(t, m.t0, m.tau),
        monTrig: [Math.cos(w0 * t), Math.sin(w0 * t), Math.cos(w1 * t), Math.sin(w1 * t)],
      }),
      { monitor: true },
    );
    const mon = await gpu.readMonitor();
    // layout: [(line*len + cell)*2 + f]*3 vec2s; vec2 = 2 floats
    const len = Math.max(box.mib - box.mia, box.mjb - box.mja) + 1;
    const get = (line: number, cell: number, f: number, comp: number): [number, number] => {
      const base = (((line * len + cell) * 2 + f) * 3 + comp) * 2;
      return [mon[base], mon[base + 1]];
    };
    const flux: [number, number] = [0, 0];
    const leftPerLen: [number, number] = [0, 0];
    const wlen = box.mjb - box.mja + 1;
    const hlen = box.mib - box.mia + 1;
    for (let f = 0; f < 2; f++) {
      let net = 0;
      let left = 0;
      for (let cell = 0; cell < wlen; cell++) {
        // <Sx> = -0.5 Re(Ez * conj(Hy))
        const [er, ei] = get(0, cell, f, 0);
        const [hr, hi] = get(0, cell, f, 2);
        const sxL = -0.5 * (er * hr + ei * hi);
        const [er2, ei2] = get(1, cell, f, 0);
        const [hr2, hi2] = get(1, cell, f, 2);
        const sxR = -0.5 * (er2 * hr2 + ei2 * hi2);
        net += sxR - sxL; // outward through right minus inward-count on left
        left += sxL;
      }
      for (let cell = 0; cell < hlen; cell++) {
        // <Sy> = +0.5 Re(Ez * conj(Hx))
        const [er, ei] = get(2, cell, f, 0);
        const [hr, hi] = get(2, cell, f, 1);
        const syB = 0.5 * (er * hr + ei * hi);
        const [er2, ei2] = get(3, cell, f, 0);
        const [hr2, hi2] = get(3, cell, f, 1);
        const syT = 0.5 * (er2 * hr2 + ei2 * hi2);
        net += syT - syB;
      }
      flux[f] = net;
      leftPerLen[f] = left / wlen;
    }
    return { box, flux, leftPerLen };
  } finally {
    gpu.destroy();
  }
}

export async function runMieGate(device: GPUDevice): Promise<MieResult> {
  // Empty run: incident irradiance per unit length through a TF-zone line.
  const inc = await mieFlux(device, false, MIE.monitorIncident);
  // Scattering run: SF-zone box sees the pure scattered field (TF/SF).
  const sca = await mieFlux(device, true, MIE.monitorScatter);
  const qMeasured: number[] = [];
  const relErr: number[] = [];
  for (let f = 0; f < 2; f++) {
    // Q_sca = P_sca / (I_inc * 2r); incident measured as +x flux per length
    const q = sca.flux[f] / (Math.abs(inc.leftPerLen[f]) * 2 * MIE.r);
    qMeasured.push(q);
    relErr.push(Math.abs(q - MIE.qGolden[f]) / MIE.qGolden[f]);
  }
  return { x: MIE.xTargets, qMeasured, qGolden: MIE.qGolden, relErr };
}

// -------------------------------------------------------------- the bundle

export interface FullCapture {
  gate: GateRun;
  fresnel: FresnelResult;
  mie: MieResult;
  bundle: CaptureBundle;
}

export async function runFullCapture(device: GPUDevice, seed: number): Promise<FullCapture> {
  const t0 = performance.now();
  const gate = await runGateScene(device);
  const fresnel = await runFresnelGate(device);
  const mie = await runMieGate(device);
  const wall = (performance.now() - t0) / 1000;

  // fold the analytic-instrument verdicts into the final checkpoint's
  // diagnostics so verify.py can gate on them (spec-ref § 6.1)
  const last = gate.steps[gate.steps.length - 1];
  last.diagnostics.fresnel_r_measured = fresnel.rMeasured;
  last.diagnostics.fresnel_r_exact = fresnel.rExact;
  last.diagnostics.fresnel_rel_err = fresnel.relErr;
  last.diagnostics.mie_qsca_x3_measured = mie.qMeasured[0];
  last.diagnostics.mie_qsca_x3_golden = mie.qGolden[0];
  last.diagnostics.mie_qsca_x3_rel_err = mie.relErr[0];
  last.diagnostics.mie_qsca_x5_measured = mie.qMeasured[1];
  last.diagnostics.mie_qsca_x5_golden = mie.qGolden[1];
  last.diagnostics.mie_qsca_x5_rel_err = mie.relErr[1];
  last.diagnostics.matched_worst_rel = gate.worstMatchedRel;

  const bundle: CaptureBundle = {
    manifest: {
      schema_version: "1.0.0",
      sim: {
        name: "fdtd-optics",
        category: "electromagnetics",
        variant: "yee-tmz-tfsf-webgpu",
      },
      stack: { name: "webgpu-f32", version: "0.0.1", build_id: "phase-6-fdtd-optics-web" },
      config: {
        tier: "test",
        dims: [GATE.n, GATE.n],
        dtype: "f32",
        seed,
        params: {
          sc: GATE.sc,
          tfsf: [GATE.ia, GATE.ib, GATE.ja, GATE.jb],
          na: GATE.na,
          ricker_t0: GATE.t0,
          ricker_tau: GATE.tau,
          cylinder: [GATE.cx, GATE.cy, GATE.r],
          eps_cyl: GATE.epsCyl,
        },
      },
      run: {
        step_count: GATE.steps,
        capture_interval: 128,
        wall_clock_seconds: wall,
        start_utc: "2026-07-09T00:00:00Z",
      },
      payload: {
        format: "hdf5",
        path: `${GATE.descriptor}.h5`,
        checksum: "sha256:" + "0".repeat(64),
      },
      determinism: { claimed: "bit-exact-same-hw", atomic_ops: false, subgroup_ops: false },
    },
    steps: gate.steps,
  };
  return { gate, fresnel, mie, bundle };
}
