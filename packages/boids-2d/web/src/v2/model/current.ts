// Swarm — the Current scene's extension to the flock (./fluid.ts): after
// every fish step the water takes one coupled step with the fish's new state.
// The fish still run the gated v4 kernel (untouched); the water reaches them
// only through their velocity, which the coupling moves towards the flow.
//
// A steady push keeps a current running — Kolmogorov forcing,
// f_x = F sin(2π y / H): east along the middle of the ocean, west along its
// edges — so the scene never settles into still water. With friction μ and
// viscosity ν the laminar balance is u = F / (μ + ν k²) sin(k y); the fish
// (and the semi-Lagrangian advection's own smoothing) set how far the real
// flow departs from it, and the page measures that rather than assuming it.

import type { Flock, FlockExt } from "./flock.js";
import type { FluidKernels, FluidParams } from "./fluid.js";
import { Fluid, fluidGrid } from "./fluid.js";

export interface CurrentConfig {
  rows: number;
  motes: number;
  params: FluidParams;
  /** Peak speed of the laminar Kolmogorov current, world units per step (0 = no push). */
  tide: number;
  /** Seed for the motes and the first ripple. */
  seed: number;
}

/** The forcing amplitude for a laminar peak speed U: F = U (μ + ν k²). */
export const tideForce = (U: number, p: FluidParams, H: number): number => {
  const k = (2 * Math.PI) / H;
  return U * (p.mu + p.nu * k * k);
};

/**
 * The starting water: the laminar Kolmogorov current u = U sin(2πy/H) with
 * a small sinuous ripple, as vorticity on the nodes (ω = −∂u/∂y + ∂v/∂x).
 */
export function kolmogorovOmega(gw: number, gh: number, halfW: number, halfH: number, U: number, seed: number): Float32Array<ArrayBuffer> {
  const W = 2 * halfW;
  const H = 2 * halfH;
  const k = (2 * Math.PI) / H;
  const om = new Float32Array(gw * gh);
  // a ripple of two long waves along the current, its phase from the seed
  const ph = ((seed * 2654435761) >>> 0) / 4294967296;
  const kx = (2 * Math.PI * 2) / W;
  const eps = 0.08;
  for (let j = 0; j < gh; j += 1) {
    const y = -halfH + (j * H) / gh;
    for (let i = 0; i < gw; i += 1) {
      const x = -halfW + (i * W) / gw;
      // ψ = −(U/k) cos(k y) + ε (U/k) sin(kx x + φ) sin(k y), so u = ∂ψ/∂y = U sin(k y) + ripple, and ω = −∇²ψ
      const base = -U * k * Math.cos(k * y);
      const rip = eps * (U / k) * (kx * kx + k * k) * Math.sin(kx * x + 2 * Math.PI * ph) * Math.sin(k * y);
      om[j * gw + i] = base + rip;
    }
  }
  return om;
}

export class CurrentExt implements FlockExt {
  readonly fluid: Fluid;
  readonly cfg: CurrentConfig;
  private readonly flock: Flock;

  constructor(device: GPUDevice, kernels: FluidKernels, flock: Flock, cfg: CurrentConfig) {
    this.flock = flock;
    this.cfg = cfg;
    const g = fluidGrid(flock.halfW, flock.halfH, cfg.rows);
    this.fluid = new Fluid(device, kernels, {
      ...g,
      halfW: flock.halfW,
      halfH: flock.halfH,
      nFish: flock.n,
      motes: cfg.motes,
      seed: cfg.seed,
      params: cfg.params,
    });
    this.tideSpeed = cfg.tide;
    this.fluid.tide = tideForce(cfg.tide, cfg.params, flock.halfH * 2);
  }

  /** The push's laminar peak speed U (world units per step). */
  tideSpeed: number;

  /** Set the push's laminar speed, or re-derive its force after ν or μ changed. */
  setTide(U = this.tideSpeed): void {
    this.tideSpeed = U;
    this.fluid.tide = tideForce(U, this.fluid.params, this.flock.halfH * 2);
  }

  prepare(_steps: number, _tick: number, pure: boolean): void {
    this.fluid.prepare(pure);
  }

  after(pass: GPUComputePassEncoder, _s: number, cur: number): void {
    this.fluid.encodeStep(pass, this.flock.boidBufs[cur]!);
  }

  reseed(seed: number): void {
    const f = this.fluid;
    f.reseed(seed);
    if (this.cfg.tide > 0) f.loadOmega(kolmogorovOmega(f.gw, f.gh, f.halfW, f.halfH, this.cfg.tide, seed));
  }

  /** The water's buffers and the knobs that drive it (a restore brings back both). */
  checkpoint(): unknown {
    return { bufs: this.fluid.checkpoint(), params: { ...this.fluid.params }, tide: this.tideSpeed };
  }

  restore(c: unknown): void {
    const saved = c as { bufs: GPUBuffer[]; params: FluidParams; tide: number };
    this.fluid.restore(saved.bufs);
    this.fluid.params = { ...saved.params };
    this.setTide(saved.tide);
  }

  release(c: unknown): void {
    for (const b of (c as { bufs: GPUBuffer[] }).bufs) b.destroy();
  }

  destroy(): void {
    this.fluid.destroy();
  }
}
