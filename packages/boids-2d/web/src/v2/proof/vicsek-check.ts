// The Order Dial's distribution-level proof (03-boids-2d.md § The proof): at
// small N, the GPU's φ(η) over K seeds must match an f64 CPU reference
// (../model/vicsek-cpu.ts) over K other seeds. The flock is chaotic, so
// paths diverge within steps; the claim is about the statistics. Per η the
// check compares the seed means of the time-averaged φ with a two-sample z
// score, z = |μ_GPU − μ_CPU| / √(s²_GPU/K + s²_CPU/K), and requires
// z ≤ Z_MAX at every η. A probe shows the test can fail: the CPU reference
// run at η + PROBE_SHIFT must not pass.

import type { FlockKernels } from "../model/flock.js";
import { Flock, orderParams, sumPartials } from "../model/flock.js";
import { makeInitM1 } from "../model/init-m1.js";
import { runVicsekCpu } from "../model/vicsek-cpu.js";
import { OPEN_WATER_RULE, VICSEK_V0 } from "../scenes.js";

export const VICSEK_CHECK = {
  /** Fish, box side (units of r: ρ = n / L² = 1), speed v₀ (r per step). */
  n: 1024,
  L: 32,
  v0: VICSEK_V0,
  etas: [0.1, 0.25, 0.4, 0.55],
  gpuSeeds: [1, 2, 3, 4, 5, 6, 7, 8],
  cpuSeeds: [101, 102, 103, 104, 105, 106, 107, 108],
  /** Steps per run, the first `relax` discarded; φ taken every `every` steps. */
  steps: 1500,
  relax: 500,
  every: 5,
  /** Declared after measuring (see the status note in 03-boids-2d.md). */
  zMax: 4,
  probeShift: 0.05,
  /** The shifted reference runs at these η (where a shift moves φ most). */
  probeEtas: [0.25, 0.4],
} as const;

export interface EtaRow {
  eta: number;
  gpu: number[];
  cpu: number[];
  gpuMean: number;
  cpuMean: number;
  z: number;
}

export interface VicsekCheck {
  rows: EtaRow[];
  maxZ: number;
  pass: boolean;
  /** The probe: the CPU at η + shift against the GPU at η; its largest z (must exceed zMax). */
  probeZ: number;
  probeFails: boolean;
  gpuSeconds: number;
  cpuSeconds: number;
}

const mean = (a: readonly number[]): number => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);
const variance = (a: readonly number[]): number => {
  const m = mean(a);
  return a.reduce((s, v) => s + (v - m) * (v - m), 0) / Math.max(a.length - 1, 1);
};

/** Two-sample z of the means (a floor on the spread keeps identical samples finite). */
export function zScore(a: readonly number[], b: readonly number[]): number {
  const se = Math.sqrt(variance(a) / a.length + variance(b) / b.length);
  return Math.abs(mean(a) - mean(b)) / Math.max(se, 1e-6);
}

/** Time average of a φ series after the relaxation. */
export function settledMean(series: ArrayLike<number>, every: number, relax: number): number {
  const skip = Math.ceil(relax / every);
  let s = 0;
  let k = 0;
  for (let i = skip; i < series.length; i += 1) {
    s += series[i]!;
    k += 1;
  }
  return k ? s / k : NaN;
}

const C = VICSEK_CHECK;

function initFor(seed: number): Float32Array<ArrayBuffer> {
  return makeInitM1(C.n, seed, C.L / 2, C.L / 2, C.v0, "aligned");
}

/** ⟨φ⟩ per (η, seed) on the GPU: every run in parallel, one submit per φ sample. */
export async function gpuMeans(device: GPUDevice, kernels: FlockKernels, etas: readonly number[] = C.etas): Promise<number[][]> {
  const runs: { flock: Flock; series: GPUBuffer }[] = [];
  const samples = Math.floor(C.steps / C.every);
  for (const eta of etas) {
    for (const seed of C.gpuSeeds) {
      const flock = new Flock(device, kernels, {
        n: C.n,
        halfW: C.L / 2,
        halfH: C.L / 2,
        seed,
        rule: OPEN_WATER_RULE,
        brain: { kind: "vicsek", p: { r: 1, speed: C.v0, eta } },
        init: "aligned",
        broadphase: "sort",
      });
      const series = device.createBuffer({ size: samples * flock.groups * 40, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "swarm-phi-series" });
      runs.push({ flock, series });
    }
  }
  try {
    for (let s = 0; s < samples; s += 1) {
      const cmds: GPUCommandBuffer[] = [];
      for (const r of runs) {
        const enc = device.createCommandEncoder({ label: "swarm-vicsek-check" });
        r.flock.encodeSteps(enc, C.every, { pure: true });
        r.flock.encodeReduce(enc);
        enc.copyBufferToBuffer(r.flock.partialsBuffer, 0, r.series, s * r.flock.groups * 40, r.flock.groups * 40);
        cmds.push(enc.finish());
      }
      device.queue.submit(cmds);
      if (s % 32 === 31) await device.queue.onSubmittedWorkDone();
    }
    await Promise.all(runs.map((r) => r.series.mapAsync(GPUMapMode.READ)));
    const out: number[][] = etas.map(() => []);
    runs.forEach((r, k) => {
      const all = new Int32Array(r.series.getMappedRange().slice(0));
      const g = r.flock.groups;
      const phi = new Float64Array(samples);
      for (let s = 0; s < samples; s += 1) phi[s] = orderParams(sumPartials(all.subarray(s * g * 10, (s + 1) * g * 10), g)).phi;
      out[Math.floor(k / C.gpuSeeds.length)]!.push(settledMean(phi, C.every, C.relax));
    });
    return out;
  } finally {
    for (const r of runs) {
      r.flock.destroy();
      r.series.destroy();
    }
  }
}

/** ⟨φ⟩ per (η, seed) on the CPU reference (f64), yielding between runs. */
export async function cpuMeans(etas: readonly number[] = C.etas): Promise<number[][]> {
  const out: number[][] = [];
  for (const eta of etas) {
    const row: number[] = [];
    for (const seed of C.cpuSeeds) {
      const init = Float64Array.from(
        (() => {
          const f = initFor(seed);
          const a: number[] = [];
          for (let i = 0; i < C.n; i += 1) a.push(f[i * 6]!, f[i * 6 + 1]!, f[i * 6 + 2]!, f[i * 6 + 3]!);
          return a;
        })(),
      );
      const phi = runVicsekCpu({ n: C.n, L: C.L, v0: C.v0, eta, seed, steps: C.steps, every: C.every, init });
      row.push(settledMean(phi, C.every, C.relax));
      await new Promise((r) => setTimeout(r, 0));
    }
    out.push(row);
  }
  return out;
}

export async function runVicsekCheck(device: GPUDevice, kernels: FlockKernels): Promise<VicsekCheck> {
  const t0 = performance.now();
  const gpu = await gpuMeans(device, kernels);
  const t1 = performance.now();
  const cpu = await cpuMeans();
  const probe = await cpuMeans(C.probeEtas.map((e) => e + C.probeShift));
  const t2 = performance.now();
  const rows: EtaRow[] = C.etas.map((eta, i) => ({
    eta,
    gpu: gpu[i]!,
    cpu: cpu[i]!,
    gpuMean: mean(gpu[i]!),
    cpuMean: mean(cpu[i]!),
    z: zScore(gpu[i]!, cpu[i]!),
  }));
  const maxZ = Math.max(...rows.map((r) => r.z));
  const probeZ = Math.max(...C.probeEtas.map((e, i) => zScore(gpu[C.etas.indexOf(e)]!, probe[i]!)));
  return {
    rows,
    maxZ,
    pass: maxZ <= C.zMax,
    probeZ,
    probeFails: probeZ > C.zMax,
    gpuSeconds: (t1 - t0) / 1000,
    cpuSeconds: (t2 - t1) / 1000,
  };
}
