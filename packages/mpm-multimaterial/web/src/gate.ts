// gate.ts — the verification instrument: canonical replay, closed-form
// artifacts, per-material invariant fixtures (spec § 2.1 / § 4.3).
//
// Everything here binds to committed files through the data spine
// (src/generated/verification.json) and the public/ gate assets whose
// SHA-256 the spine re-verifies at build time.

import V from "./generated/verification.json";
import FIX from "../fixtures/reference-fixtures.json";
import {
  FLOATS_PER_PARTICLE,
  FP_SCALE_DEFAULT,
  P_OFF,
  packParticle,
  type MpmGpu,
  type SimConfig,
} from "./solver.js";
import {
  bsplineN,
  det3,
  mulberry32,
  neoHookeanStress,
  orthoDeviation,
  pouSum,
  singularValues3,
} from "./mirror.js";

export const CANON = {
  gridN: 16,
  n: 5_000,
  dt: 1e-4,
  gravityZ: -9.81,
  floorZ: 4,
  steps: 50,
  interval: 10,
  mu: V.canonical.params_as_run.mu,
  lam: V.canonical.params_as_run.lam,
  massPerParticle: V.canonical.params_as_run.mass_per_particle,
  volumePerParticle: V.canonical.params_as_run.volume_per_particle,
  blobVz: -2.0,
} as const;

// HARD-FAIL if the generated spine drifted from the hardcoded contract.
if (
  V.canonical.params_as_run.grid_n !== CANON.gridN ||
  V.canonical.params_as_run.n_particles !== CANON.n ||
  V.canonical.params_as_run.dt !== CANON.dt ||
  V.canonical.params_as_run.gravity_z !== CANON.gravityZ ||
  V.canonical.params_as_run.floor_z_index !== CANON.floorZ ||
  V.canonical.params_as_run.blob_initial_vz !== CANON.blobVz
) {
  throw new Error("verification.json canonical params drifted from gate.ts CANON");
}

let icCache: Float32Array | null = null;
let refsCache: Float64Array | null = null;

export async function fetchIC(): Promise<Float32Array> {
  if (icCache) return icCache;
  const r = await fetch("./mpm-gate-ic.bin");
  if (!r.ok) throw new Error("mpm-gate-ic.bin fetch failed");
  const arr = new Float32Array(await r.arrayBuffer());
  if (arr.length !== CANON.n * 3) throw new Error("mpm-gate-ic.bin size mismatch");
  icCache = arr;
  return arr;
}

export async function fetchRefs(): Promise<Float64Array> {
  if (refsCache) return refsCache;
  const r = await fetch("./mpm-gate-refs.bin");
  if (!r.ok) throw new Error("mpm-gate-refs.bin fetch failed");
  const arr = new Float64Array(await r.arrayBuffer());
  if (arr.length !== V.canonical.checkpoints.length * CANON.n * 6) {
    throw new Error("mpm-gate-refs.bin size mismatch");
  }
  refsCache = arr;
  return arr;
}

export function gateSimConfig(): SimConfig {
  return {
    gridN: CANON.gridN,
    nParticles: CANON.n,
    dt: CANON.dt,
    gravity: [0, 0, CANON.gravityZ],
    floorZ: CANON.floorZ,
    fpScale: FP_SCALE_DEFAULT,
    // masses ride normalized to 1; stress rescaled by 1/mass_unit
    invMassUnit: 1 / CANON.massPerParticle,
    vmaxClamp: 1e9,
    frame: 0,
    nPointers: 0,
  };
}

export function gateMaterials(): Parameters<MpmGpu["setMaterials"]>[0] {
  return [
    {
      model: 0,
      mu0: CANON.mu,
      lam0: CANON.lam,
      xi: 0,
      thetaC: 0,
      thetaS: 0,
      alpha: 0,
      kStiff: 0,
      gammaExp: 1,
    },
  ];
}

export function packGateScene(ic: Float32Array): Float32Array {
  const data = new Float32Array(CANON.n * FLOATS_PER_PARTICLE);
  for (let i = 0; i < CANON.n; i += 1) {
    packParticle(
      data,
      i,
      [ic[i * 3], ic[i * 3 + 1], ic[i * 3 + 2]],
      [0, 0, CANON.blobVz],
      1.0,
      CANON.volumePerParticle,
      0,
    );
  }
  return data;
}

export interface Checkpoint {
  step: number;
  position: Float32Array;
  velocity: Float32Array;
  raw: Float32Array; // full particle buffer bytes (run-twice byte-identity)
}

function extract(particles: Float32Array, n: number): {
  position: Float32Array;
  velocity: Float32Array;
} {
  const position = new Float32Array(n * 3);
  const velocity = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    const o = i * FLOATS_PER_PARTICLE;
    position[i * 3] = particles[o];
    position[i * 3 + 1] = particles[o + 1];
    position[i * 3 + 2] = particles[o + 2];
    velocity[i * 3] = particles[o + P_OFF.vel];
    velocity[i * 3 + 1] = particles[o + P_OFF.vel + 1];
    velocity[i * 3 + 2] = particles[o + P_OFF.vel + 2];
  }
  return { position, velocity };
}

/**
 * Replay the committed diagnostic canonical (16-cube drop-impact, 50 steps
 * at dt = 1e-4) from the committed step-0 IC, reading the full particle
 * state at every committed checkpoint.
 */
export async function runCanonicalReplay(
  gpu: MpmGpu,
  ic: Float32Array,
  onProgress?: (step: number) => void,
): Promise<Checkpoint[]> {
  gpu.configure(gateSimConfig());
  gpu.setMaterials(gateMaterials());
  gpu.setPointers([]);
  gpu.uploadParticles(packGateScene(ic), CANON.n);
  const checkpoints: Checkpoint[] = [];
  const read = async (step: number): Promise<void> => {
    const raw = await gpu.readParticles(CANON.n);
    const { position, velocity } = extract(raw, CANON.n);
    checkpoints.push({ step, position, velocity, raw });
  };
  await read(0);
  for (let step = 0; step < CANON.steps; step += CANON.interval) {
    gpu.step(CANON.interval);
    await read(step + CANON.interval);
    onProgress?.(step + CANON.interval);
  }
  return checkpoints;
}

export interface CheckpointErrors {
  rows: { step: number; posMaxAbs: number; velMaxAbs: number; ratio: number }[];
  worstRatio: number;
  worst: { position: number; velocity: number };
  finite: boolean;
}

/** Pointwise |browser - committed f64| per checkpoint vs the rel budget. */
export function checkpointErrors(
  cps: Checkpoint[],
  refs: Float64Array,
): CheckpointErrors {
  const trajRel = V.gate.thresholds.traj_rel;
  const rows: CheckpointErrors["rows"] = [];
  let worstRatio = 0;
  const worst = { position: 0, velocity: 0 };
  let finite = true;
  cps.forEach((cp, ci) => {
    const base = ci * CANON.n * 6;
    let posMax = 0;
    let velMax = 0;
    let posPeak = 0;
    let velPeak = 0;
    for (let i = 0; i < CANON.n; i += 1) {
      for (let d = 0; d < 3; d += 1) {
        const bp = cp.position[i * 3 + d];
        const bv = cp.velocity[i * 3 + d];
        if (!Number.isFinite(bp) || !Number.isFinite(bv)) finite = false;
        const rp = refs[base + i * 6 + d];
        const rv = refs[base + i * 6 + 3 + d];
        posMax = Math.max(posMax, Math.abs(bp - rp));
        velMax = Math.max(velMax, Math.abs(bv - rv));
        posPeak = Math.max(posPeak, Math.abs(bp));
        velPeak = Math.max(velPeak, Math.abs(bv));
      }
    }
    const ratio = Math.max(
      posPeak > 0 ? posMax / (trajRel * posPeak) : 0,
      velPeak > 0 ? velMax / (trajRel * velPeak) : 0,
    );
    rows.push({ step: cp.step, posMaxAbs: posMax, velMaxAbs: velMax, ratio });
    worstRatio = Math.max(worstRatio, ratio);
    worst.position = Math.max(worst.position, posMax);
    worst.velocity = Math.max(worst.velocity, velMax);
  });
  return { rows, worstRatio, worst, finite };
}

// ---------------------------------------------------------------------------
// Closed-form + invariant artifacts
// ---------------------------------------------------------------------------

export interface GateArtifacts {
  // golden B-spline
  goldenF64Dev: number; // JS f64 mirror vs committed table (1e-15-class)
  goldenF32RelDev: number; // GPU f32 vs table, relative
  pouF64Dev: number;
  pouGpuMaxDev: number; // GPU partition-of-unity sweep, |sum - 1| max
  bsplineGpuF32: Float32Array; // N(x) at the 10 table points, GPU f32
  bsplineF64: Float64Array;
  pouGpuF32: Float32Array; // at the 3 table points
  pouF64: Float64Array;
  // committed neo-Hookean fixture (incl. the J<=0 guard row)
  neoMirrorMaxAbs: number; // TS f64 mirror vs committed reference values
  neoGpuMaxRel: number; // WGSL f32 vs committed reference values
  neoGpuF32: Float32Array; // 16 x 9
  neoMirrorF64: Float64Array;
  // fixed-point transfer witnesses (exact integer arithmetic)
  massTotalQuanta: number;
  massLeakQuanta: number;
  massLeakBoundQuanta: number;
  momZLeakQuanta: number;
  maxCellQuanta: number;
  headroomRatio: number; // maxCellQuanta / 2^31
  // per-material invariants (JS f64 SVD of GPU return-map output)
  snowSigma: Float64Array; // 64 x 3 singular values of F_out
  snowSigmaMin: number;
  snowSigmaMax: number;
  snowOk: boolean;
  sandCases: Float32Array; // 64 case ids
  sandLogdetIn: Float64Array;
  sandLogdetOut: Float64Array;
  sandCase3MaxDev: number; // |tr(Hp) - tr(eps)| via log det, Case III
  sandCase2OrthoDev: number; // ||F^T F - I||_max at the cone tip
  sandOk: boolean;
}

const N_MAT_FIXTURES = 64;

/** Deterministic trial-F batch spanning all three return-map cases. */
export function makeTrialF(seed: number): Float64Array {
  const rng = mulberry32(seed);
  const out = new Float64Array(N_MAT_FIXTURES * 9);
  for (let i = 0; i < N_MAT_FIXTURES; i += 1) {
    const o = i * 9;
    for (let k = 0; k < 9; k += 1) out[o + k] = (k % 4 === 0 ? 1 : 0);
    if (i < 12) {
      // near-identity — elastic / Case I candidates
      for (let k = 0; k < 9; k += 1) out[o + k] += (rng() - 0.5) * 0.004;
    } else if (i < 28) {
      // expansion — tr(eps) > 0 — Case II tip candidates
      const s = 1.05 + rng() * 0.25;
      out[o] *= s;
      out[o + 4] *= s;
      out[o + 8] *= s;
      for (let k = 0; k < 9; k += 1) out[o + k] += (rng() - 0.5) * 0.02;
    } else {
      // compression + shear — Case III cone-face candidates
      out[o] *= 0.75 + rng() * 0.15;
      out[o + 4] *= 0.75 + rng() * 0.15;
      out[o + 8] *= 0.75 + rng() * 0.15;
      out[o + 1] += (rng() - 0.5) * 0.5;
      out[o + 2] += (rng() - 0.5) * 0.5;
      out[o + 5] += (rng() - 0.5) * 0.5;
    }
  }
  return out;
}

export async function computeGateArtifacts(
  gpu: MpmGpu,
  liveMaterials: Parameters<MpmGpu["setMaterials"]>[0],
): Promise<GateArtifacts> {
  const T = V.gate.thresholds;
  // Golden B-spline + partition-of-unity, f64 mirror and GPU f32.
  const xs = V.golden.xs as number[];
  const tableN = V.golden.n_values as number[];
  const ps = V.golden.pou_ps as number[];
  const bsplineF64 = new Float64Array(xs.map((x) => bsplineN(x)));
  const pouF64 = new Float64Array(ps.map((p) => pouSum(p)));
  let goldenF64Dev = 0;
  xs.forEach((_, i) => {
    goldenF64Dev = Math.max(goldenF64Dev, Math.abs(bsplineF64[i] - tableN[i]));
  });
  let pouF64Dev = 0;
  ps.forEach((_, i) => {
    pouF64Dev = Math.max(pouF64Dev, Math.abs(pouF64[i] - 1.0));
  });

  // GPU sweep: table points + a deterministic ladder.
  const ladderX = Array.from({ length: 256 }, (_, i) => -2 + (4 * (i + 0.5)) / 256);
  const ladderP = Array.from({ length: 256 }, (_, i) => -8 + (16 * (i + 0.5)) / 256);
  gpu.configure(gateSimConfig());
  const gout = await gpu.runGolden([...xs, ...ladderX], [...ps, ...ladderP]);
  const bsplineGpuF32 = gout.slice(0, xs.length);
  let goldenF32RelDev = 0;
  xs.forEach((x, i) => {
    const ref = tableN[i];
    const scale = Math.max(Math.abs(ref), 1e-3);
    goldenF32RelDev = Math.max(goldenF32RelDev, Math.abs(gout[i] - ref) / scale);
    void x;
  });
  ladderX.forEach((x, i) => {
    const ref = bsplineN(x);
    const scale = Math.max(Math.abs(ref), 1e-3);
    goldenF32RelDev = Math.max(
      goldenF32RelDev,
      Math.abs(gout[xs.length + i] - ref) / scale,
    );
  });
  const pouBase = xs.length + ladderX.length;
  const pouGpuF32 = gout.slice(pouBase, pouBase + ps.length);
  let pouGpuMaxDev = 0;
  for (let i = 0; i < ps.length + ladderP.length; i += 1) {
    pouGpuMaxDev = Math.max(pouGpuMaxDev, Math.abs(gout[pouBase + i] - 1.0));
  }

  // Committed neo-Hookean fixture: TS f64 mirror + WGSL f32 vs reference f64.
  const fixF = FIX.neo_hookean_16.F as number[][][];
  const fixS = FIX.neo_hookean_16.stress as number[][][];
  const mu = FIX.neo_hookean_16.mu as number;
  const lam = FIX.neo_hookean_16.lam as number;
  const nFix = fixF.length;
  const neoMirrorF64 = new Float64Array(nFix * 9);
  let neoMirrorMaxAbs = 0;
  const stressIn = new Float32Array(nFix * 12);
  for (let i = 0; i < nFix; i += 1) {
    const fRow = fixF[i].flat();
    const mirror = neoHookeanStress(fRow, mu, lam);
    const refRow = fixS[i].flat();
    for (let k = 0; k < 9; k += 1) {
      neoMirrorF64[i * 9 + k] = mirror[k];
      neoMirrorMaxAbs = Math.max(neoMirrorMaxAbs, Math.abs(mirror[k] - refRow[k]));
      stressIn[i * 12 + k] = fRow[k];
    }
    stressIn[i * 12 + 9] = 0; // material 0 = the canonical neo-Hookean slot
    stressIn[i * 12 + 10] = 1;
  }
  gpu.setMaterials(gateMaterials());
  const neoGpuF32 = await gpu.runStressEval(stressIn, nFix);
  let neoGpuMaxRel = 0;
  for (let i = 0; i < nFix; i += 1) {
    const refRow = fixS[i].flat();
    let peak = 1e-3;
    for (let k = 0; k < 9; k += 1) peak = Math.max(peak, Math.abs(refRow[k]));
    for (let k = 0; k < 9; k += 1) {
      neoGpuMaxRel = Math.max(
        neoGpuMaxRel,
        Math.abs(neoGpuF32[i * 12 + k] - refRow[k]) / peak,
      );
    }
  }

  // Fixed-point P2G mass/momentum witness on the canonical IC (F = I so the
  // stress term vanishes — a pure-transfer check; integer sums are EXACT).
  const ic = await fetchIC();
  gpu.configure(gateSimConfig());
  gpu.uploadParticles(packGateScene(ic), CANON.n);
  const quanta = await gpu.runP2gOnly();
  let massTotal = 0;
  let momZ = 0;
  let maxCell = 0;
  const cells = CANON.gridN ** 3;
  for (let c = 0; c < cells; c += 1) {
    const m = quanta[c * 4];
    massTotal += m;
    momZ += quanta[c * 4 + 3];
    maxCell = Math.max(
      maxCell,
      Math.abs(m),
      Math.abs(quanta[c * 4 + 1]),
      Math.abs(quanta[c * 4 + 2]),
      Math.abs(quanta[c * 4 + 3]),
    );
  }
  const M = FP_SCALE_DEFAULT;
  const massLeakQuanta = Math.abs(massTotal - CANON.n * M);
  const momZLeakQuanta = Math.abs(momZ - CANON.n * CANON.blobVz * M);
  const massLeakBoundQuanta = Math.ceil(13.5 * CANON.n); // 27 roundings x 0.5

  // Per-material invariants — snow SV bounds, sand volume preservation.
  const snowTrial = makeTrialF(1337);
  const sandTrial = makeTrialF(7331);
  const packTrial = (t: Float64Array, mode: number): Float32Array => {
    const inp = new Float32Array(N_MAT_FIXTURES * 12);
    for (let i = 0; i < N_MAT_FIXTURES; i += 1) {
      for (let k = 0; k < 9; k += 1) inp[i * 12 + k] = t[i * 9 + k];
      inp[i * 12 + 9] = mode;
      inp[i * 12 + 10] = 1;
    }
    return inp;
  };
  gpu.setMaterials(liveMaterials);
  const snowOut = await gpu.runFixtures(packTrial(snowTrial, 1), N_MAT_FIXTURES);
  const sandOut = await gpu.runFixtures(packTrial(sandTrial, 2), N_MAT_FIXTURES);
  gpu.setMaterials(gateMaterials());

  const snowMat = liveMaterials[Math.min(1, liveMaterials.length - 1)];
  const loBound = 1 - snowMat.thetaC - T.snow_sigma_slack;
  const hiBound = 1 + snowMat.thetaS + T.snow_sigma_slack;
  const snowSigma = new Float64Array(N_MAT_FIXTURES * 3);
  let snowSigmaMin = Infinity;
  let snowSigmaMax = -Infinity;
  for (let i = 0; i < N_MAT_FIXTURES; i += 1) {
    const fOut: number[] = [];
    for (let k = 0; k < 9; k += 1) fOut.push(snowOut[i * 16 + k]);
    const sv = singularValues3(fOut); // independent f64 SVD of the GPU output
    snowSigma.set(sv, i * 3);
    snowSigmaMin = Math.min(snowSigmaMin, sv[2]);
    snowSigmaMax = Math.max(snowSigmaMax, sv[0]);
  }
  const snowOk = snowSigmaMin >= loBound && snowSigmaMax <= hiBound;

  const sandCases = new Float32Array(N_MAT_FIXTURES);
  const sandLogdetIn = new Float64Array(N_MAT_FIXTURES);
  const sandLogdetOut = new Float64Array(N_MAT_FIXTURES);
  let sandCase3MaxDev = 0;
  let sandCase2OrthoDev = 0;
  let sawCase2 = false;
  let sawCase3 = false;
  for (let i = 0; i < N_MAT_FIXTURES; i += 1) {
    const fIn: number[] = [];
    const fOut: number[] = [];
    for (let k = 0; k < 9; k += 1) {
      fIn.push(sandTrial[i * 9 + k]);
      fOut.push(sandOut[i * 16 + k]);
    }
    const caseId = sandOut[i * 16 + 12];
    sandCases[i] = caseId;
    const dIn = det3(fIn);
    const dOut = det3(fOut);
    sandLogdetIn[i] = Math.log(Math.max(dIn, 1e-12));
    sandLogdetOut[i] = Math.log(Math.max(dOut, 1e-12));
    if (caseId === 3) {
      sawCase3 = true;
      sandCase3MaxDev = Math.max(
        sandCase3MaxDev,
        Math.abs(sandLogdetOut[i] - sandLogdetIn[i]),
      );
    } else if (caseId === 2) {
      sawCase2 = true;
      sandCase2OrthoDev = Math.max(sandCase2OrthoDev, orthoDeviation(fOut));
    }
  }
  const sandOk =
    sawCase2 &&
    sawCase3 &&
    sandCase3MaxDev <= T.sand_logdet_abs &&
    sandCase2OrthoDev <= T.sand_ortho_abs;

  return {
    goldenF64Dev,
    goldenF32RelDev,
    pouF64Dev,
    pouGpuMaxDev,
    bsplineGpuF32,
    bsplineF64,
    pouGpuF32,
    pouF64,
    neoMirrorMaxAbs,
    neoGpuMaxRel,
    neoGpuF32,
    neoMirrorF64,
    massTotalQuanta: massTotal,
    massLeakQuanta,
    massLeakBoundQuanta,
    momZLeakQuanta,
    maxCellQuanta: maxCell,
    headroomRatio: maxCell / 2 ** 31,
    snowSigma,
    snowSigmaMin,
    snowSigmaMax,
    snowOk,
    sandCases,
    sandLogdetIn,
    sandLogdetOut,
    sandCase3MaxDev,
    sandCase2OrthoDev,
    sandOk,
  };
}
