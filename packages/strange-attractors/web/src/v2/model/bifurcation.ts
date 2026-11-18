// Road to Chaos: the bifurcation diagram's model (bifurcation.wgsl). A
// population of trajectories in columns, each column at its own ρ; z peaks
// after the warm-up are binned by z / ρ into a counts buffer the diagram
// view reads directly (no readback for the picture).

import { hash3, unit } from "@bp/runtime";
import { wgsl } from "@bp/gpu";
import type { LorenzParams, V3 } from "./lorenz.js";
import { DT } from "./lorenz.js";
import src from "./bifurcation.wgsl?raw";

/** The diagram's vertical axis: z peak ÷ ρ. Fixed points sit at (ρ − 1)/ρ ≈ 0.95; chaos spans ~1.02–1.67. */
export const Y0 = 0.9;
export const Y1 = 1.75;

export interface BifSize {
  cols: number;
  per: number;
  bins: number;
}

/** Tier sizes (05-strange-attractors.md, performance targets). */
export const BIF_SIZES = {
  T3: { cols: 2048, per: 32, bins: 1024 },
  T2: { cols: 1024, per: 16, bins: 768 },
  T1: { cols: 512, per: 8, bins: 512 },
} as const satisfies Record<string, BifSize>;

/** Warm-up before peaks count: 60 time units (transients near the bifurcation points are slow). */
export const BIF_WARM_STEPS = 6000;

export class Bifurcation {
  readonly counts: GPUBuffer;
  readonly totals: GPUBuffer;
  readonly cols: number;
  readonly per: number;
  readonly bins: number;
  readonly n: number;
  rho0 = 20;
  rho1 = 250;
  /** Steps every trajectory has taken since the last reset. */
  steps = 0;
  seed = 1;
  private readonly rhos: GPUBuffer;
  private readonly state: GPUBuffer;
  private readonly hist: GPUBuffer;
  private readonly params: GPUBuffer;
  private readonly bind: GPUBindGroup;
  private needsInit = true;

  private constructor(
    private readonly device: GPUDevice,
    private readonly pipe: GPUComputePipeline,
    size: BifSize,
    private readonly lorenz: () => LorenzParams,
  ) {
    this.cols = size.cols;
    this.per = size.per;
    this.bins = size.bins;
    this.n = size.cols * size.per;
    const st = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    this.rhos = device.createBuffer({ size: this.cols * 4, usage: st, label: "bif-rhos" });
    this.state = device.createBuffer({ size: this.n * 16, usage: st, label: "bif-state" });
    this.hist = device.createBuffer({ size: this.n * 16, usage: st, label: "bif-hist" });
    this.counts = device.createBuffer({ size: this.cols * this.bins * 4, usage: st, label: "bif-counts" });
    this.totals = device.createBuffer({ size: this.cols * 4, usage: st, label: "bif-totals" });
    this.params = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "bif-params" });
    this.bind = device.createBindGroup({
      layout: pipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.params } },
        { binding: 1, resource: { buffer: this.rhos } },
        { binding: 2, resource: { buffer: this.state } },
        { binding: 3, resource: { buffer: this.hist } },
        { binding: 4, resource: { buffer: this.counts } },
        { binding: 5, resource: { buffer: this.totals } },
      ],
    });
  }

  static async pipeline(device: GPUDevice): Promise<GPUComputePipeline> {
    const module = device.createShaderModule({ code: wgsl(src), label: "bifurcation" });
    return device.createComputePipelineAsync({ label: "bif_step", layout: "auto", compute: { module, entryPoint: "bif_step" } });
  }

  /** σ and β come from `params` (ρ is each column's own). */
  static create(device: GPUDevice, pipe: GPUComputePipeline, size: BifSize, params: () => LorenzParams): Bifurcation {
    return new Bifurcation(device, pipe, size, params);
  }

  /** ρ of a column (its centre) for a range. */
  static rhoOf(col: number, cols: number, rho0: number, rho1: number): number {
    return rho0 + ((col + 0.5) / cols) * (rho1 - rho0);
  }

  /** Columns over a ρ range (the live diagram). */
  setRange(rho0: number, rho1: number): void {
    this.rho0 = rho0;
    this.rho1 = rho1;
    const r = new Float32Array(this.cols);
    for (let c = 0; c < this.cols; c += 1) r[c] = Bifurcation.rhoOf(c, this.cols, rho0, rho1);
    this.setRhos(r);
  }

  /** Columns at given ρ values (Prove's test columns); restarts. */
  setRhos(r: Float32Array): void {
    this.device.queue.writeBuffer(this.rhos, 0, r, 0, Math.min(r.length, this.cols));
    this.reset();
  }

  /** Start every trajectory afresh and forget the counts. */
  reset(): void {
    this.needsInit = true;
    this.steps = 0;
  }

  private write(steps: number, mode: 0 | 1): void {
    const b = new ArrayBuffer(64);
    const p = this.lorenz();
    new Float32Array(b, 0, 8).set([p.sigma, p.beta, DT, Y0, Y1, 0, 0, 0]);
    new Uint32Array(b, 32, 8).set([this.n, this.per, this.cols, this.bins, steps, BIF_WARM_STEPS, this.seed >>> 0, mode]);
    this.device.queue.writeBuffer(this.params, 0, b);
  }

  /** Record `steps` steps of every trajectory (one dispatch; initialises first if needed). */
  encode(enc: GPUCommandEncoder, steps: number, timestampWrites?: GPUComputePassTimestampWrites): void {
    if (this.needsInit) {
      // one encoder holds one parameter write: initialise in its own submission
      enc.clearBuffer(this.counts);
      enc.clearBuffer(this.totals);
      const init = this.device.createCommandEncoder({ label: "bif-init" });
      this.write(0, 1);
      const p = init.beginComputePass({ label: "bif-init" });
      p.setPipeline(this.pipe);
      p.setBindGroup(0, this.bind);
      p.dispatchWorkgroups(Math.ceil(this.n / 256));
      p.end();
      this.device.queue.submit([init.finish()]);
      this.needsInit = false;
      return;
    }
    if (steps <= 0) return;
    this.write(steps, 0);
    const pass = enc.beginComputePass({ label: "bifurcation", timestampWrites });
    pass.setPipeline(this.pipe);
    pass.setBindGroup(0, this.bind);
    pass.dispatchWorkgroups(Math.ceil(this.n / 256));
    pass.end();
    this.steps += steps;
  }

  /** Warm-up still under way (peaks are not counted yet). */
  get warming(): boolean {
    return this.steps < BIF_WARM_STEPS;
  }

  /** Read the counts back: [bin * cols + col]. */
  async readCounts(): Promise<Uint32Array> {
    const size = this.cols * this.bins * 4;
    const staging = this.device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "bif-read" });
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(this.counts, 0, staging, 0, size);
    this.device.queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const out = new Uint32Array(staging.getMappedRange().slice(0));
    staging.destroy();
    return out;
  }

  destroy(): void {
    for (const b of [this.rhos, this.state, this.hist, this.counts, this.totals, this.params]) b.destroy();
  }
}

/** The start of trajectory i (mirror of start_of in bifurcation.wgsl, in f64; rounded to f32 like the GPU's). */
export function bifStart(seed: number, i: number, rho: number, beta: number): V3 {
  const u = [0, 1, 2].map((k) => unit(hash3(seed, i, k)) * 2 - 1) as V3;
  const a = Math.sqrt(Math.max(beta * (rho - 1), 1));
  return [Math.fround(u[0] * a), Math.fround(u[1] * a), Math.fround(Math.max(rho - 1, 1) * (1 + 0.3 * u[2]))];
}
