// Swarm M2 proofs (Prove cards and acceptance hooks). Each runs on its own
// scratch flock or water, never the live one, and reports what it measured.
//
//   motes      the water is incompressible where the fish feel it: 65,536
//              motes ridden through a stirred current stay evenly spread
//              (index of dispersion ≈ 1, the Poisson value), while the same
//              motes ridden through the gradient of ψ — the same speeds,
//              but compressible — pile up;
//   exchange   fish ↔ water conserves momentum: with the fish's own
//              swimming switched off, fb·Σ Δv_fish + N·ΔU₀ = 0 up to f32;
//   ride       the coupling does what Current says: from one seed, with and
//              without the coupling, the school swims with the water and
//              the water is changed by the school;
//   replay     Food Chain replays byte for byte: two runs from one seed.

import { readBuffer } from "@bp/gpu";
import { CurrentExt, kolmogorovOmega } from "../model/current.js";
import type { EcoKernels } from "../model/ecology.js";
import { EcologyExt, FOOD_CHAIN } from "../model/ecology.js";
import type { FlockKernels } from "../model/flock.js";
import { Flock } from "../model/flock.js";
import type { FluidKernels } from "../model/fluid.js";
import { CURRENT_FLUID, Fluid, bilinearCurl, dispersionIndex, fluidGrid } from "../model/fluid.js";
import { V4_DENSITY, worldFor } from "../model/world.js";
import { OPEN_WATER_RULE } from "../scenes.js";

/**
 * Declared budgets, measured first on the RX 6800 XT (see 03-boids-2d.md M2).
 * Motes: index 1.027 at the end (0.974 at the start); random points scatter
 * it by √(2/cells) ≈ 0.06, so 1.25 is about 4σ. The control measured 1,155.
 */
export const M2_CHECK = {
  motes: { n: 65536, steps: 2400, cells: [32, 18] as const, seed: 7, maxIndex: 1.25, controlMin: 3 },
  // measured 2.1e-10 (RADV); declared with room for other GPUs' f32 rounding
  exchange: { n: 16384, steps: 30, seed: 3, maxImbalance: 1e-6 },
  // measured alignment 0.97 coupled, −0.02 free
  ride: { n: 65536, steps: 900, seed: 5, minGain: 0.5 },
  // fish efficiency raised so births happen within the run (the scene's own is slower)
  replay: { n: 16384, steps: 600, seed: 42, efficiency: 0.5 },
} as const;

async function sha256(parts: ArrayBuffer[]): Promise<string> {
  const total = parts.reduce((a, p) => a + p.byteLength, 0);
  const all = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    all.set(new Uint8Array(p), o);
    o += p.byteLength;
  }
  const d = await crypto.subtle.digest("SHA-256", all);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const wait = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

export interface MotesCheck {
  index: number;
  control: number;
  start: number;
  maxSpeed: number;
  divRatio: number;
  poisson: number;
  pass: boolean;
  seconds: number;
}

/**
 * Motes in a stirred current: the scene's water (Kolmogorov push plus a ring
 * of brush strokes), no fish. The index of dispersion over a coarse grid must
 * stay near 1; the gradient-flow control must exceed `controlMin`.
 */
export async function motesCheck(device: GPUDevice, fk: FluidKernels): Promise<MotesCheck> {
  const t0 = performance.now();
  const c = M2_CHECK.motes;
  const world = worldFor(262144, 16, 9, V4_DENSITY / 2);
  const run = async (mode: number): Promise<{ idx: number; start: number; st: Awaited<ReturnType<Fluid["readStats"]>> }> => {
    const g = fluidGrid(world.halfW, world.halfH, 128);
    const f = new Fluid(device, fk, { ...g, ...world, nFish: 0, motes: c.n, seed: c.seed, params: { ...CURRENT_FLUID } });
    try {
      f.loadOmega(kolmogorovOmega(f.gw, f.gh, f.halfW, f.halfH, 0.0065, c.seed));
      f.tide = 0.0065 * (CURRENT_FLUID.mu + CURRENT_FLUID.nu * ((2 * Math.PI) / (2 * world.halfH)) ** 2);
      f.moteMode = mode;
      const start = dispersionIndex(await f.readMotes(), f.halfW, f.halfH, c.cells[0], c.cells[1]);
      for (let s = 0; s < c.steps; s += 16) {
        // a ring of strokes in the first 200 steps stirs eddies across the current
        const a = (s / 200) * 2 * Math.PI;
        f.brush = s < 200 ? { x: Math.cos(a) * f.halfW * 0.5, y: Math.sin(a) * f.halfH * 0.5, ix: -Math.sin(a) * 2e-4, iy: Math.cos(a) * 2e-4, radius: 1.5 } : null;
        f.prepare();
        const enc = device.createCommandEncoder();
        const pass = enc.beginComputePass();
        for (let k = 0; k < 16; k += 1) f.encodeStep(pass, null);
        pass.end();
        device.queue.submit([enc.finish()]);
        if (s % 320 === 0) await device.queue.onSubmittedWorkDone();
      }
      const idx = dispersionIndex(await f.readMotes(), f.halfW, f.halfH, c.cells[0], c.cells[1]);
      return { idx, start, st: await f.readStats() };
    } finally {
      f.destroy();
    }
  };
  const a = await run(0);
  await wait();
  const b = await run(1);
  const divRatio = a.st.maxGrad > 0 ? a.st.maxDiv / a.st.maxGrad : 0;
  return {
    index: a.idx,
    control: b.idx,
    start: a.start,
    maxSpeed: a.st.maxSpeed,
    divRatio,
    poisson: a.st.poisson,
    pass: a.idx <= c.maxIndex && b.idx >= c.controlMin,
    seconds: (performance.now() - t0) / 1000,
  };
}

export interface ExchangeCheck {
  fishMomentum: number;
  waterMomentum: number;
  /** |fish + water| / Σ|fish changes|. */
  imbalance: number;
  /** Σ |Δv| per fish, the scale of the exchange. */
  exchanged: number;
  pass: boolean;
}

/**
 * The exchange alone: fish and water from a seed, the fish frozen (no fish
 * kernel), `steps` coupled water steps with no friction and no push. The fish
 * momentum gained, fb·Σ Δv, must cancel the water's, N·ΔU₀.
 */
export async function exchangeCheck(device: GPUDevice, kernels: FlockKernels, fk: FluidKernels): Promise<ExchangeCheck> {
  const c = M2_CHECK.exchange;
  const world = worldFor(c.n, 16, 9, V4_DENSITY / 2);
  let ext: CurrentExt | null = null;
  const flock = new Flock(device, kernels, {
    n: c.n,
    ...world,
    seed: c.seed,
    rule: OPEN_WATER_RULE,
    init: "random",
    broadphase: "sort",
    ext: (f) => (ext = new CurrentExt(device, fk, f, { rows: 64, motes: 0, params: { ...CURRENT_FLUID, mu: 0, nu: 0 }, tide: 0.0065, seed: c.seed })),
  });
  try {
    const fl = (ext as unknown as CurrentExt).fluid;
    fl.tide = 0;
    // let the water start moving (the Kolmogorov start) so fish and water differ
    const v0 = await flock.readBoids();
    const u0 = (await fl.readPsi()).u0;
    fl.prepare(true);
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    for (let s = 0; s < c.steps; s += 1) fl.encodeStep(pass, flock.boids);
    pass.end();
    device.queue.submit([enc.finish()]);
    const v1 = await flock.readBoids();
    const u1 = (await fl.readPsi()).u0;
    let fx = 0;
    let fy = 0;
    let ex = 0;
    for (let i = 0; i < c.n; i += 1) {
      const dx = v1[i * 6 + 2]! - v0[i * 6 + 2]!;
      const dy = v1[i * 6 + 3]! - v0[i * 6 + 3]!;
      fx += dx;
      fy += dy;
      ex += Math.hypot(dx, dy);
    }
    // momenta in units of one node's water mass × (world units / step)
    const fb = fl.fb;
    const fishP = [fb * fx, fb * fy];
    const waterP = [fl.cells * (u1[0] - u0[0]), fl.cells * (u1[1] - u0[1])];
    const imbalance = Math.hypot(fishP[0]! + waterP[0]!, fishP[1]! + waterP[1]!) / Math.max(fb * ex, 1e-30);
    return { fishMomentum: Math.hypot(fishP[0]!, fishP[1]!), waterMomentum: Math.hypot(waterP[0]!, waterP[1]!), imbalance, exchanged: ex / c.n, pass: imbalance <= c.maxImbalance && ex > 0 };
  } finally {
    flock.destroy();
  }
}

export interface RideCheck {
  /** Mean cos(angle) between each fish's velocity and the water's at it: with the coupling, without. */
  alignCoupled: number;
  alignFree: number;
  /** The water's mean energy after the run: with the coupling, without. */
  energyCoupled: number;
  energyFree: number;
  pass: boolean;
  seconds: number;
}

async function alignment(device: GPUDevice, flock: Flock, fl: Fluid): Promise<number> {
  const [b, { psi, u0 }] = await Promise.all([flock.readBoids(), fl.readPsi()]);
  let sum = 0;
  let k = 0;
  for (let i = 0; i < flock.n; i += 1) {
    const x = b[i * 6]!;
    const y = b[i * 6 + 1]!;
    const vx = b[i * 6 + 2]!;
    const vy = b[i * 6 + 3]!;
    const [u, v] = bilinearCurl(psi, fl.gw, fl.gh, fl.hx, fl.hy, (x + fl.halfW) / fl.hx, (y + fl.halfH) / fl.hy);
    const uu = u + u0[0];
    const vv = v + u0[1];
    const n = Math.hypot(vx, vy) * Math.hypot(uu, vv);
    if (n > 0) {
      sum += (vx * uu + vy * vv) / n;
      k += 1;
    }
  }
  void device;
  return sum / Math.max(k, 1);
}

/** From one seed, the Current scene's fish and water with the coupling and without (drag 0). */
export async function rideCheck(device: GPUDevice, kernels: FlockKernels, fk: FluidKernels): Promise<RideCheck> {
  const t0 = performance.now();
  const c = M2_CHECK.ride;
  const world = worldFor(c.n, 16, 9, V4_DENSITY / 2);
  const run = async (drag: number): Promise<{ align: number; energy: number }> => {
    let ext: CurrentExt | null = null;
    const flock = new Flock(device, kernels, {
      n: c.n,
      ...world,
      seed: c.seed,
      rule: OPEN_WATER_RULE,
      init: "random",
      broadphase: "sort",
      sortEvery: 16,
      ext: (f) => (ext = new CurrentExt(device, fk, f, { rows: 128, motes: 0, params: { ...CURRENT_FLUID, drag }, tide: 0.0065, seed: c.seed })),
    });
    try {
      for (let s = 0; s < c.steps; s += 16) {
        const enc = device.createCommandEncoder();
        flock.encodeSteps(enc, 16, { pure: true });
        device.queue.submit([enc.finish()]);
        if (s % 320 === 0) await device.queue.onSubmittedWorkDone();
      }
      const fl = (ext as unknown as CurrentExt).fluid;
      const align = await alignment(device, flock, fl);
      const st = await fl.readStats();
      return { align, energy: st.energy };
    } finally {
      flock.destroy();
    }
  };
  const a = await run(CURRENT_FLUID.drag);
  await wait();
  const b = await run(0);
  return {
    alignCoupled: a.align,
    alignFree: b.align,
    energyCoupled: a.energy,
    energyFree: b.energy,
    pass: a.align - b.align >= c.minGain,
    seconds: (performance.now() - t0) / 1000,
  };
}

export interface ReplayCheck {
  hashes: [string, string];
  other: string;
  identical: boolean;
  differs: boolean;
  births: number;
  eaten: number;
  fish: number;
  sharks: number;
  seconds: number;
}

/** Food Chain from one seed, twice (and once from another seed): boids, sharks and plankton hashed. */
export async function replayCheck(device: GPUDevice, kernels: FlockKernels, ek: EcoKernels): Promise<ReplayCheck> {
  const t0 = performance.now();
  const c = M2_CHECK.replay;
  const world = worldFor(c.n, 16, 9, V4_DENSITY);
  const run = async (seed: number): Promise<{ hash: string; births: number; eaten: number; fish: number; sharks: number }> => {
    let ext: EcologyExt | null = null;
    const flock = new Flock(device, kernels, {
      n: c.n,
      ...world,
      seed,
      rule: OPEN_WATER_RULE,
      init: "random",
      broadphase: "sort",
      sortEvery: 0,
      ext: (f) => (ext = new EcologyExt(device, ek, f, { fish0: Math.round(0.15 * c.n), sharkSlots: 64, sharks0: 12, params: { ...FOOD_CHAIN, efficiency: c.efficiency } })),
    });
    try {
      for (let s = 0; s < c.steps; s += 16) {
        const enc = device.createCommandEncoder();
        flock.encodeSteps(enc, Math.min(16, c.steps - s), { pure: true });
        device.queue.submit([enc.finish()]);
      }
      const e = ext as unknown as EcologyExt;
      const census = await e.readCensusNow();
      const parts = await Promise.all([
        readBuffer(device, flock.boids, flock.bytes),
        readBuffer(device, e.sharks, e.sharks.size),
        readBuffer(device, e.plankton[e.pCur]!, e.plankton[e.pCur]!.size),
      ]);
      return { hash: await sha256(parts), births: census.births, eaten: census.eaten, fish: census.fish, sharks: census.sharks };
    } finally {
      flock.destroy();
    }
  };
  const a = await run(c.seed);
  const b = await run(c.seed);
  const o = await run(c.seed + 1);
  return {
    hashes: [a.hash, b.hash],
    other: o.hash,
    identical: a.hash === b.hash,
    differs: o.hash !== a.hash,
    births: a.births,
    eaten: a.eaten,
    fish: a.fish,
    sharks: a.sharks,
    seconds: (performance.now() - t0) / 1000,
  };
}
