// Gate harness: the committed web-gate canonical replay + the
// closed-form artifact suite. Everything here is chaos-immune or
// robust-observable by design (web spec § 2.1):
//  - golden tables evaluated on the visitor's GPU (f32, measured residual)
//    AND in the in-page IEEE-f64 mirror (dyadic rows bit-exact);
//  - transfer bit-identity (parallel atomic P2G == single-thread lex
//    oracle, both on-device, i32-exact);
//  - the 60-step 12-cube dam-break replay from the committed f32 IC,
//    gated on ROBUST OBSERVABLES vs the committed f64 references
//    (per-particle pointwise is REJECTED: chaos + fixed-point != f64);
//  - still-pool inertness + hydrostatic dP/dz probes (regularizers ON).
import V from "./generated/verification.json";
import type { PicFlipGpu, SimConfig } from "./solver.js";
import {
  bsplineN,
  computeObservables,
  mirrorAngularMomentum2d,
  mirrorAngularMomentum3d,
  mirrorRoundtrip,
  mirrorTransferErrorLadder,
  sha256hex,
  weightMoments,
  type Observables,
} from "./mirror.js";

export const GATE = {
  nx: V.gate_assets.params_as_run.nx as number,
  dx: V.gate_assets.params_as_run.dx as number,
  dt: V.gate_assets.params_as_run.dt as number,
  gravity: V.gate_assets.params_as_run.gravity as number,
  rho: V.gate_assets.params_as_run.rho as number,
  nJacobi: V.gate_assets.params_as_run.n_jacobi as number,
  nExtrap: V.gate_assets.params_as_run.n_extrapolation_layers as number,
  nWall: V.gate_assets.params_as_run.n_wall as number,
  cfl: V.gate_assets.params_as_run.cfl as number,
  driftK: V.gate_assets.params_as_run.drift_k as number,
  pushIters: V.gate_assets.params_as_run.push_apart_iters as number,
  pushRadiusFactor: V.gate_assets.params_as_run.push_apart_radius_factor as number,
  n: V.gate_assets.params_as_run.n_particles as number,
  steps: V.gate_assets.step_count as number,
  interval: V.gate_assets.capture_interval as number,
  checkpoints: V.gate_assets.checkpoints as number[],
};

export function gateSimConfig(rhoRest: number): SimConfig {
  return {
    nx: GATE.nx,
    ny: GATE.nx,
    nz: GATE.nx,
    n: GATE.n,
    nWall: GATE.nWall,
    dx: GATE.dx,
    dt: GATE.dt,
    rho: GATE.rho,
    gravity: [0, 0, GATE.gravity],
    mode: "apic",
    nSolve: GATE.nJacobi,
    nExtrap: GATE.nExtrap,
    cfl: GATE.cfl,
    driftOn: true,
    driftK: GATE.driftK,
    pushOn: true,
    pushIters: GATE.pushIters,
    pushRadiusFactor: GATE.pushRadiusFactor,
    flipRatio: 1.0,
    sorOmega: 1.9,
    rhoRest,
    vmax: 1e9, // no ceiling on the gate path
    liveSolver: false,
    warmStart: false,
    obstacle: [0, 0, 0, 0],
    obstacleVel: [0, 0, 0],
  };
}

let icCache: Float32Array | null = null;
export async function fetchIC(): Promise<Float32Array> {
  if (icCache) return icCache;
  const r = await fetch("./picflip-gate-ic.bin");
  if (!r.ok) throw new Error("picflip-gate-ic.bin fetch failed");
  const bytes = new Uint8Array(await r.arrayBuffer());
  const sha = await sha256hex(bytes);
  if (sha !== V.gate_assets.ic_sha256) {
    throw new Error(`gate IC sha mismatch: ${sha} != ${V.gate_assets.ic_sha256}`);
  }
  icCache = new Float32Array(bytes.buffer);
  if (icCache.length !== GATE.n * 3) throw new Error("gate IC size mismatch");
  return icCache;
}

let refsCache: Float64Array | null = null;
export async function fetchRefs(): Promise<Float64Array> {
  if (refsCache) return refsCache;
  const r = await fetch("./picflip-gate-refs.bin");
  if (!r.ok) throw new Error("picflip-gate-refs.bin fetch failed");
  const bytes = new Uint8Array(await r.arrayBuffer());
  const sha = await sha256hex(bytes);
  if (sha !== V.gate_assets.refs_sha256) {
    throw new Error(`gate refs sha mismatch: ${sha} != ${V.gate_assets.refs_sha256}`);
  }
  refsCache = new Float64Array(bytes.buffer);
  return refsCache;
}

export interface Checkpoint {
  step: number;
  pos: Float32Array;
  vel: Float32Array;
  obs: Observables;
  maxDiv: number;
  sortSaturated: boolean;
}

export async function runCanonicalReplay(
  gpu: PicFlipGpu,
  ic: Float32Array,
  onProgress?: (step: number) => void,
): Promise<{ checkpoints: Checkpoint[]; rhoRest: number }> {
  const zeros = new Float32Array(GATE.n * 3);
  gpu.configure(gateSimConfig(0));
  gpu.clearReduce();
  gpu.uploadParticles(ic, zeros, GATE.n);
  const rhoRest = await gpu.measureRhoRest();
  gpu.configure(gateSimConfig(rhoRest));
  // Re-upload: measureRhoRest ran P2G on the same state (read-only for
  // particles) but be explicit that step 0 starts from the committed IC.
  gpu.uploadParticles(ic, zeros, GATE.n);

  const checkpoints: Checkpoint[] = [];
  const G = GATE.nx * GATE.nx * GATE.nx;
  const read = async (step: number): Promise<void> => {
    const st = await gpu.readState(GATE.n);
    const red = await gpu.readReduce();
    checkpoints.push({
      step,
      pos: st.pos,
      vel: st.vel,
      obs: computeObservables(st.pos, st.vel, GATE.n, GATE.nx, GATE.nx, GATE.nx, GATE.dx, GATE.nWall),
      maxDiv: red.maxDiv,
      sortSaturated: red.sortSaturated,
    });
  };
  await read(0);
  for (let step = 1; step <= GATE.steps; step += 1) {
    gpu.step(1);
    if (step % GATE.interval === 0) {
      await read(step);
      onProgress?.(step);
    }
  }
  void G;
  return { checkpoints, rhoRest };
}

export interface CheckpointErrors {
  worstRatio: number;
  worstObs: string;
  rows: { step: number; ratio: number }[];
}

const OBS_NAMES = [
  "kinetic_energy",
  "momentum_x",
  "momentum_y",
  "momentum_z",
  "com_x",
  "com_y",
  "com_z",
  "max_speed",
  "fluid_node_count",
  "max_column_height",
];

// Robust-observable comparison: per component, scale = max |ref| over all
// checkpoints (per-observable), budget = declared_rel * scale.
export function checkpointErrors(cps: Checkpoint[], refs: Float64Array): CheckpointErrors {
  const nObs = 10;
  const scale = new Float64Array(nObs);
  for (let c = 0; c < GATE.checkpoints.length; c += 1) {
    for (let o = 0; o < nObs; o += 1) {
      scale[o] = Math.max(scale[o], Math.abs(refs[c * nObs + o]));
    }
  }
  const rel = V.gate.declared_rel as number;
  let worstRatio = 0;
  let worstObs = "";
  const rows: { step: number; ratio: number }[] = [];
  cps.forEach((cp, ci) => {
    const got = [
      cp.obs.kineticEnergy,
      cp.obs.momentum[0],
      cp.obs.momentum[1],
      cp.obs.momentum[2],
      cp.obs.com[0],
      cp.obs.com[1],
      cp.obs.com[2],
      cp.obs.maxSpeed,
      cp.obs.fluidNodeCount,
      cp.obs.maxColumnHeight,
    ];
    let ratio = 0;
    for (let o = 0; o < nObs; o += 1) {
      const budget = rel * scale[o];
      if (budget > 0) {
        const r = Math.abs(got[o] - refs[ci * nObs + o]) / budget;
        ratio = Math.max(ratio, r);
        if (r > worstRatio) {
          worstRatio = r;
          worstObs = `${OBS_NAMES[o]}@${cp.step}`;
        }
      }
    }
    rows.push({ step: cp.step, ratio });
  });
  return { worstRatio, worstObs, rows };
}

// --- closed-form artifacts --------------------------------------------------

type TablePoint = { inputs: Record<string, unknown>; expected: Record<string, unknown> };

export interface GateArtifacts {
  weightsNF32: Float32Array;
  weightsNF64: Float64Array;
  momentsF32: Float32Array;
  momentsF64: Float64Array;
  pouMaxDevF32: number;
  am2F32: Float32Array;
  am2F64: Float64Array;
  am3F32: Float32Array;
  am3F64: Float64Array;
  rtF32: Float32Array;
  rtF64: Float64Array;
  transferLadderF64: Float64Array;
  bitIdentityEqual: boolean;
  bitIdentityCells: number;
  atomicF64: Float64Array;
  oracleF64: Float64Array;
  fpHeadroomRatio: number;
  // f32-vs-f64 summary residuals (relative, for the panel + spec MEASURED block)
  weightsF32RelMax: number;
  amF32ConsRelMax: number;
  rtF32ErrRelMax: number;
}

const N_SAMPLE_XS = (V.golden.weights_sample_xs as number[]).length;
const FP_PROBES = V.golden.weights_fp_probes as number[];

export async function computeGateArtifacts(gpu: PicFlipGpu): Promise<GateArtifacts> {
  // -- weights golden (GPU f32 via golden_weights + f64 mirror) --
  const xs = V.golden.weights_sample_xs as number[];
  const pouSweep: number[] = [];
  for (let i = 0; i < 257; i += 1) pouSweep.push(0.5 + (i * 4.0) / 257);
  const input = new Float32Array(3 + xs.length + FP_PROBES.length + pouSweep.length);
  input[0] = xs.length;
  input[1] = FP_PROBES.length;
  input[2] = pouSweep.length;
  input.set(xs, 3);
  input.set(FP_PROBES, 3 + xs.length);
  input.set(pouSweep, 3 + xs.length + FP_PROBES.length);
  const wOutLen = xs.length + FP_PROBES.length * 6 + pouSweep.length;
  const wOut = await gpu.runAux("golden_weights", input, wOutLen);
  const weightsNF32 = wOut.slice(0, xs.length);
  const weightsNF64 = new Float64Array(xs.map((x) => bsplineN(x)));
  const momentsF32 = new Float32Array(FP_PROBES.length * 3);
  const momentsF64 = new Float64Array(FP_PROBES.length * 3);
  for (let f = 0; f < FP_PROBES.length; f += 1) {
    const o = xs.length + f * 6;
    momentsF32[3 * f] = wOut[o + 3];
    momentsF32[3 * f + 1] = wOut[o + 4];
    momentsF32[3 * f + 2] = wOut[o + 5];
    const m = weightMoments(FP_PROBES[f]);
    momentsF64[3 * f] = m.sumW;
    momentsF64[3 * f + 1] = m.sumWR;
    momentsF64[3 * f + 2] = m.sumWR2;
  }
  let pouMaxDevF32 = 0;
  for (let q = 0; q < pouSweep.length; q += 1) {
    pouMaxDevF32 = Math.max(
      pouMaxDevF32,
      Math.abs(wOut[xs.length + FP_PROBES.length * 6 + q] - 1),
    );
  }

  // -- angular momentum golden (per table point, 2D + 3D) --
  const amPts = V.golden.am_points as TablePoint[];
  const am2f32: number[] = [];
  const am2f64: number[] = [];
  const am3f32: number[] = [];
  const am3f64: number[] = [];
  for (const tp of amPts) {
    const parts = tp.inputs.particles as {
      x: number[];
      m: number;
      v: number[];
      B: number[][];
    }[];
    const dx = tp.inputs.dx as number;
    const is3d = parts[0].x.length === 3;
    if (!is3d) {
      const inp = new Float32Array(2 + parts.length * 9);
      inp[0] = parts.length;
      inp[1] = dx;
      parts.forEach((p, i) => {
        inp.set(
          [p.x[0], p.x[1], p.m, p.v[0], p.v[1], p.B[0][0], p.B[0][1], p.B[1][0], p.B[1][1]],
          2 + 9 * i,
        );
      });
      const out = await gpu.runAux("golden_am2", inp, 4);
      am2f32.push(out[0], out[1], out[2], out[3]);
      const m = mirrorAngularMomentum2d(
        parts.map((p) => ({ x: [p.x[0], p.x[1]], m: p.m, v: [p.v[0], p.v[1]], B: p.B })),
        dx,
      );
      am2f64.push(m.lBefore, m.lGrid, m.lAfterApic, m.lAfterPic);
    } else {
      const inp = new Float32Array(2 + parts.length * 16);
      inp[0] = parts.length;
      inp[1] = dx;
      parts.forEach((p, i) => {
        inp.set([...p.x, p.m, ...p.v, ...p.B.flat()], 2 + 16 * i);
      });
      const out = await gpu.runAux("golden_am3", inp, 12);
      am3f32.push(...out.slice(0, 12));
      const m = mirrorAngularMomentum3d(
        parts.map((p) => ({
          x: p.x as [number, number, number],
          m: p.m,
          v: p.v as [number, number, number],
          B: p.B,
        })),
        dx,
      );
      am3f64.push(...m.lBefore, ...m.lGrid, ...m.lAfterApic, ...m.lAfterPic);
    }
  }

  // -- affine round-trip golden (Prop 5.1, grid -> particle -> grid) --
  const rtPts = V.golden.rt_points as TablePoint[];
  const rtf32: number[] = [];
  const rtf64: number[] = [];
  for (const tp of rtPts) {
    const ndim = (tp.inputs.positions as number[][])[0].length as 2 | 3;
    const dx = tp.inputs.dx as number;
    const v0 = tp.inputs.v0 as number[];
    const C = tp.inputs.C as number[][];
    const positions = tp.inputs.positions as number[][];
    const masses = tp.inputs.masses as number[];
    const sampleNode = tp.expected.sample_node as number[];
    const inp: number[] = [ndim, positions.length, dx, ...v0];
    for (const row of C) inp.push(...row);
    for (const p of positions) inp.push(...p);
    inp.push(...masses);
    inp.push(...sampleNode);
    const out = await gpu.runAux("golden_roundtrip", new Float32Array(inp), 7);
    rtf32.push(out[0], out[1], out[2], out[3], out[4], out[5], out[6]);
    const m = mirrorRoundtrip({ ndim, dx, v0, C, positions, masses, sampleNode });
    rtf64.push(
      m.apicMaxAbsErr,
      m.fieldScale,
      m.nMassed,
      m.sampleV[0],
      m.sampleV[1],
      m.sampleV[2] ?? 0,
      m.picMaxAbsDev,
    );
  }

  // -- transfer-error 1/9 discrete midpoint ladder (f64, dyadic-exact) --
  const tePts = V.golden.te_points as TablePoint[];
  const ladder: number[] = [];
  for (const tp of tePts) {
    for (const n of [4, 16, 64]) {
      ladder.push(
        mirrorTransferErrorLadder(
          tp.inputs.a as number,
          tp.inputs.b as number,
          tp.inputs.c as number,
          n,
        ),
      );
    }
  }

  // -- transfer bit-identity on the committed gate IC --
  const ic = await fetchIC();
  const zeros = new Float32Array(GATE.n * 3);
  gpu.configure(gateSimConfig(0));
  gpu.uploadParticles(ic, zeros, GATE.n);
  const bit = await gpu.runTransferBitIdentity();
  const G = GATE.nx * GATE.nx * GATE.nx;
  let equal = bit.atomic.length === bit.oracle.length;
  let maxQ = 0;
  if (equal) {
    for (let i = 0; i < G * 4; i += 1) {
      if (bit.atomic[i] !== bit.oracle[i]) {
        equal = false;
        break;
      }
      maxQ = Math.max(maxQ, Math.abs(bit.atomic[i]));
    }
  }
  const atomicF64 = new Float64Array(G * 4);
  const oracleF64 = new Float64Array(G * 4);
  for (let i = 0; i < G * 4; i += 1) {
    atomicF64[i] = bit.atomic[i];
    oracleF64[i] = bit.oracle[i];
  }

  // f32-vs-f64 measured summaries.
  let weightsF32RelMax = 0;
  for (let i = 0; i < N_SAMPLE_XS; i += 1) {
    const scale = Math.max(Math.abs(weightsNF64[i]), 1e-30);
    weightsF32RelMax = Math.max(weightsF32RelMax, Math.abs(weightsNF32[i] - weightsNF64[i]) / scale);
  }
  let amF32ConsRelMax = 0;
  for (let p = 0; p < am2f32.length / 4; p += 1) {
    const s = Math.max(Math.abs(am2f64[4 * p]), 1e-30);
    amF32ConsRelMax = Math.max(
      amF32ConsRelMax,
      Math.abs(am2f32[4 * p + 1] - am2f32[4 * p]) / s,
      Math.abs(am2f32[4 * p + 2] - am2f32[4 * p]) / s,
    );
  }
  for (let p = 0; p < am3f32.length / 12; p += 1) {
    for (let a = 0; a < 3; a += 1) {
      const s = Math.max(Math.abs(am3f64[12 * p + a]), 1e-30);
      amF32ConsRelMax = Math.max(
        amF32ConsRelMax,
        Math.abs(am3f32[12 * p + 3 + a] - am3f32[12 * p + a]) / s,
        Math.abs(am3f32[12 * p + 6 + a] - am3f32[12 * p + a]) / s,
      );
    }
  }
  let rtF32ErrRelMax = 0;
  for (let p = 0; p < rtf32.length / 7; p += 1) {
    const s = Math.max(rtf32[7 * p + 1], 1e-30);
    rtF32ErrRelMax = Math.max(rtF32ErrRelMax, rtf32[7 * p] / s);
  }

  return {
    weightsNF32,
    weightsNF64,
    momentsF32,
    momentsF64,
    pouMaxDevF32,
    am2F32: new Float32Array(am2f32),
    am2F64: new Float64Array(am2f64),
    am3F32: new Float32Array(am3f32),
    am3F64: new Float64Array(am3f64),
    rtF32: new Float32Array(rtf32),
    rtF64: new Float64Array(rtf64),
    transferLadderF64: new Float64Array(ladder),
    bitIdentityEqual: equal,
    bitIdentityCells: G,
    atomicF64,
    oracleF64,
    fpHeadroomRatio: maxQ / 2 ** 31,
    weightsF32RelMax,
    amF32ConsRelMax,
    rtF32ErrRelMax,
  };
}

// --- still-pool + hydrostatic probes (regularizers ON, gate tier) ---------

export interface StillProbe {
  maxSpeed: number;
  fluidNodesDelta: number;
  dpdz: number; // measured interior pressure gradient (expect -rho*g*... )
  dpdzTargetRel: number; // |dpdz - rho*|g||/ (rho*|g|)
}

export async function runStillProbe(
  gpu: PicFlipGpu,
  steps = 30,
  nSolveOverride?: number, // falsifiability: 20 = the GPU Gems 3 sinking failure
): Promise<StillProbe> {
  // Deterministic unjittered still pool at the gate tier: bottom ~50% of
  // the interior filled on the exact reference lattice (2/axis/cell) —
  // jitter-free so regularizer inertness is exercised bit-for-bit.
  const nx = GATE.nx;
  const dx = GATE.dx;
  const nWall = GATE.nWall;
  const lo = nWall * dx;
  const hi = (nx - 1 - nWall) * dx;
  const zTop = lo + 0.5 * (hi - lo);
  const spacing = 0.5 * dx;
  const pts: number[] = [];
  for (let x = lo + 0.5 * spacing; x < hi; x += spacing) {
    for (let y = lo + 0.5 * spacing; y < hi; y += spacing) {
      for (let z = lo + 0.5 * spacing; z < zTop; z += spacing) {
        pts.push(x, y, z);
      }
    }
  }
  const pos = new Float32Array(pts);
  const n = pts.length / 3;
  const cfgBase = {
    ...gateSimConfig(0),
    ...(nSolveOverride !== undefined ? { nSolve: nSolveOverride } : {}),
  };
  gpu.configure({ ...cfgBase, n });
  gpu.clearReduce();
  gpu.uploadParticles(pos, new Float32Array(n * 3), n);
  const rhoRest = await gpu.measureRhoRest();
  gpu.configure({ ...cfgBase, n, rhoRest });
  gpu.uploadParticles(pos, new Float32Array(n * 3), n);
  const obs0 = computeObservables(pos, new Float32Array(n * 3), n, nx, nx, nx, dx, nWall);
  for (let s = 0; s < steps; s += 1) gpu.step(1);
  const st = await gpu.readState(n);
  const obs1 = computeObservables(st.pos, st.vel, n, nx, nx, nx, dx, nWall);
  // Hydrostatic probe: pressure profile down the column centre.
  const G = nx * nx * nx;
  const pr = await gpu.readGridField("pressure", G);
  const labels = await gpu.readLabels(G);
  const ci = Math.floor(nx / 2);
  let sumGrad = 0;
  let nGrad = 0;
  for (let k = 0; k < nx - 1; k += 1) {
    const a = ci + nx * (ci + nx * k);
    const b = ci + nx * (ci + nx * (k + 1));
    if (labels[a] === 1 && labels[b] === 1) {
      sumGrad += (pr[b] - pr[a]) / dx;
      nGrad += 1;
    }
  }
  const dpdz = nGrad > 0 ? sumGrad / nGrad : NaN;
  const target = GATE.rho * GATE.gravity; // -9.81: dP/dz = rho * g_z
  const dpdzTargetRel = Math.abs((dpdz - target) / target);
  return {
    maxSpeed: obs1.maxSpeed,
    fluidNodesDelta: obs1.fluidNodeCount - obs0.fluidNodeCount,
    dpdz,
    dpdzTargetRel,
  };
}
