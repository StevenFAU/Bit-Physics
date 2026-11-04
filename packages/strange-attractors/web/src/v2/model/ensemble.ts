// The live Lorenz model on the GPU (05-strange-attractors.md, "The model"):
// two particle populations stepped together, one thread per particle.
//
//   density   particles already on the attractor (plain f32 RK4, the gated
//             kernel's arithmetic) — the long-exposure picture of the
//             attractor itself.
//   ensemble  the released ball: f32 offsets from an f64 reference
//             trajectory integrated on the CPU (model/lorenz.ts). The first
//             `track` members are also written after every step, for the
//             ribbons that follow a few of them.
//
// One `encodeSteps` advances the reference and both populations by n steps
// in one pass; the stage points of those n reference steps go up in one
// queue write. Spread (RMS distance of the ensemble from its own centre) is
// reduced on the GPU and read back without stalling.

import { ReadbackSlot, wgsl } from "@bp/gpu";
import ensembleSrc from "./ensemble.wgsl?raw";
import reduceSrc from "./reduce.wgsl?raw";
import releaseSrc from "./release.wgsl?raw";
import type { LorenzParams, V3 } from "./lorenz.js";
import { DT, Reference, stretchDirection } from "./lorenz.js";

/** Most steps one frame may take (8× speed at 60 fps is 32). */
export const MAX_STEPS = 32;
/** Ensemble members the ribbons follow. */
export const TRACK = 12;
const REDUCE_PER_GROUP = 4096;

export interface Population {
  state: GPUBuffer;
  prev: GPUBuffer;
  n: number;
}

export class ChaosKernels {
  private constructor(
    readonly density: GPUComputePipeline,
    readonly ensemble: GPUComputePipeline,
    readonly release: GPUComputePipeline,
    readonly reduce: GPUComputePipeline,
  ) {}

  static async create(device: GPUDevice): Promise<ChaosKernels> {
    const main = device.createShaderModule({ code: ensembleSrc, label: "chaos-ensemble" });
    const rel = device.createShaderModule({ code: wgsl(releaseSrc), label: "chaos-release" });
    const red = device.createShaderModule({ code: reduceSrc, label: "chaos-reduce" });
    const [d, e, r, s] = await Promise.all([
      device.createComputePipelineAsync({ label: "density_step", layout: "auto", compute: { module: main, entryPoint: "density_step" } }),
      device.createComputePipelineAsync({ label: "ensemble_step", layout: "auto", compute: { module: main, entryPoint: "ensemble_step" } }),
      device.createComputePipelineAsync({ label: "release", layout: "auto", compute: { module: rel, entryPoint: "release" } }),
      device.createComputePipelineAsync({ label: "reduce", layout: "auto", compute: { module: red, entryPoint: "reduce" } }),
    ]);
    return new ChaosKernels(d, e, r, s);
  }
}

function population(device: GPUDevice, n: number, label: string): Population {
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
  return {
    n,
    state: device.createBuffer({ size: n * 16, usage, label: `${label}-state` }),
    prev: device.createBuffer({ size: n * 16, usage, label: `${label}-prev` }),
  };
}

export interface SpreadSample {
  /** Model time of the sample. */
  t: number;
  /** RMS distance of the members from their centroid. */
  spread: number;
  /** Centroid of the members (model coordinates). */
  centre: V3;
}

/** A save point: GPU copies of both populations' states and the CPU reference. */
export interface ChaosCheckpoint {
  density: Population;
  ensemble: Population;
  ref: V3;
  refSteps: number;
  steps: number;
  released: boolean;
  releaseT0: number;
  eps: number;
  params: LorenzParams;
}

export class Chaos {
  readonly density: Population;
  readonly ensemble: Population;
  /** The ball's centre: the f64 reference the ensemble's offsets are measured from. */
  ref = new Reference([0, 0, 0]);
  /** Where the reference was at the start of the last frame's steps (the previous origin). */
  prevRef: V3 = [0, 0, 0];
  /** Reference positions after each of the last frame's steps (ribbon origins). */
  readonly stepOrigins: V3[] = [];
  params: LorenzParams;
  dt = DT;
  /** Total steps since the scene started. */
  steps = 0;
  /** Has a ball been released (and the step it was released at). */
  released = false;
  releaseStep = 0;
  /** Ball radius at release. */
  eps = 1e-6;
  /** Speed at the top of the density palette (model units / time). */
  speedScale = 120;
  /** Colour axis of the current ball (its initial stretching direction). */
  axis: V3 = [1, 0, 0];
  readonly trail: GPUBuffer;
  private readonly stages: GPUBuffer;
  private readonly densityParams: GPUBuffer;
  private readonly ensembleParams: GPUBuffer;
  private readonly releaseParams: GPUBuffer;
  private readonly reduceParams: GPUBuffer;
  private readonly partials: GPUBuffer;
  private readonly groups: number;
  private readonly slot: ReadbackSlot;
  private densityBind: GPUBindGroup;
  private ensembleBind: GPUBindGroup;
  private readonly stageData = new Float32Array(MAX_STEPS * 16);
  private reduceT = -1;

  constructor(
    private readonly device: GPUDevice,
    private readonly k: ChaosKernels,
    nEnsemble: number,
    nDensity: number,
    params: LorenzParams,
  ) {
    this.params = { ...params };
    this.density = population(device, nDensity, "density");
    this.ensemble = population(device, nEnsemble, "ensemble");
    const u = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
    this.densityParams = device.createBuffer({ size: 32, usage: u, label: "density-params" });
    this.ensembleParams = device.createBuffer({ size: 32, usage: u, label: "ensemble-params" });
    this.releaseParams = device.createBuffer({ size: 48, usage: u, label: "release-params" });
    this.reduceParams = device.createBuffer({ size: 16, usage: u, label: "reduce-params" });
    this.stages = device.createBuffer({ size: MAX_STEPS * 64, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "stages" });
    this.trail = device.createBuffer({ size: MAX_STEPS * TRACK * 16, usage: GPUBufferUsage.STORAGE, label: "trail" });
    this.groups = Math.ceil(nEnsemble / REDUCE_PER_GROUP);
    this.partials = device.createBuffer({ size: this.groups * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, label: "spread-partials" });
    this.slot = new ReadbackSlot(device, this.groups * 16, "spread-readback");
    this.densityBind = this.bindStep(k.density, this.density, this.densityParams);
    this.ensembleBind = this.bindStep(k.ensemble, this.ensemble, this.ensembleParams);
    device.queue.writeBuffer(this.reduceParams, 0, new Uint32Array([nEnsemble, REDUCE_PER_GROUP, 0, 0]));
  }

  private bindStep(pipe: GPUComputePipeline, pop: Population, params: GPUBuffer): GPUBindGroup {
    const isEnsemble = pipe === this.k.ensemble;
    return this.device.createBindGroup({
      layout: pipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: pop.state } },
        { binding: 2, resource: { buffer: pop.prev } },
        ...(isEnsemble
          ? [
              { binding: 3, resource: { buffer: this.stages } },
              { binding: 4, resource: { buffer: this.trail } },
            ]
          : []),
      ],
    });
  }

  /** Model time since the scene started. */
  get t(): number {
    return this.steps * this.dt;
  }

  /** Model time since the ball was released. */
  get tSinceRelease(): number {
    return this.released ? (this.steps - this.releaseStep) * this.dt : 0;
  }

  private writeParams(buf: GPUBuffer, n: number, steps: number, track: number): void {
    const b = new ArrayBuffer(32);
    new Float32Array(b, 0, 4).set([this.params.sigma, this.params.rho, this.params.beta, this.dt]);
    new Uint32Array(b, 16, 3).set([n, steps, track]);
    new Float32Array(b, 28, 1)[0] = 1 / Math.max(this.speedScale, 1e-6);
    this.device.queue.writeBuffer(buf, 0, b);
  }

  private encodeRelease(enc: GPUCommandEncoder, pop: Population, mode: 0 | 1, seed: number, axis: V3, eps: number, box: [number, number, number, number]): void {
    const b = new ArrayBuffer(48);
    new Float32Array(b, 0, 4).set([axis[0], axis[1], axis[2], eps]);
    new Uint32Array(b, 16, 4).set([seed >>> 0, pop.n, 0, mode]);
    new Float32Array(b, 32, 4).set(box);
    this.device.queue.writeBuffer(this.releaseParams, 0, b);
    const bind = this.device.createBindGroup({
      layout: this.k.release.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.releaseParams } },
        { binding: 1, resource: { buffer: pop.state } },
        { binding: 2, resource: { buffer: pop.prev } },
      ],
    });
    const pass = enc.beginComputePass({ label: "release" });
    pass.setPipeline(this.k.release);
    pass.setBindGroup(0, bind);
    pass.dispatchWorkgroups(Math.ceil(pop.n / 256));
    pass.end();
  }

  /**
   * Seed the density population in a box around the attractor and run its
   * transient off (`warm` steps), so the first frame already shows the
   * attractor. Submits its own command buffers.
   */
  seedDensity(seed: number, warm = 1500): void {
    const p = this.params;
    const zc = Math.max(p.rho - 1, 1);
    const half = Math.max(8, 0.9 * Math.sqrt(p.beta * Math.max(p.rho - 1, 1)) + 6, zc * 0.5);
    let enc = this.device.createCommandEncoder({ label: "density-seed" });
    this.encodeRelease(enc, this.density, 1, seed, [1, 0, 0], 0, [0, 0, zc, half]);
    this.device.queue.submit([enc.finish()]);
    const chunk = 100;
    for (let done = 0; done < warm; done += chunk) {
      enc = this.device.createCommandEncoder({ label: "density-warm" });
      this.writeParams(this.densityParams, this.density.n, Math.min(chunk, warm - done), 0);
      const pass = enc.beginComputePass({ label: "density-warm" });
      pass.setPipeline(this.k.density);
      pass.setBindGroup(0, this.densityBind);
      pass.dispatchWorkgroups(Math.ceil(this.density.n / 256));
      pass.end();
      this.device.queue.submit([enc.finish()]);
    }
  }

  /** Release a ball of radius `eps` centred on `centre` (model coordinates). */
  release(enc: GPUCommandEncoder, centre: V3, eps: number, seed: number): void {
    this.ref = new Reference(centre);
    this.prevRef = [...centre];
    this.axis = stretchDirection(this.params, centre);
    this.eps = eps;
    this.encodeRelease(enc, this.ensemble, 0, seed, this.axis, eps, [0, 0, 0, 0]);
    this.released = true;
    this.releaseStep = this.steps;
    this.stepOrigins.length = 0;
  }

  /** Advance the reference and both populations by n steps (n ≤ MAX_STEPS). */
  encodeSteps(enc: GPUCommandEncoder, n: number, timestampWrites?: GPUComputePassTimestampWrites): void {
    this.stepOrigins.length = 0;
    if (n <= 0) return;
    n = Math.min(n, MAX_STEPS);
    this.prevRef = [...this.ref.x];
    const d = this.stageData;
    for (let k = 0; k < n; k += 1) {
      const st = this.ref.step(this.params, this.dt);
      for (let j = 0; j < 4; j += 1) d.set([st[j]![0], st[j]![1], st[j]![2], 0], (k * 4 + j) * 4);
      this.stepOrigins.push([...this.ref.x]);
    }
    this.device.queue.writeBuffer(this.stages, 0, d, 0, n * 16);
    this.writeParams(this.densityParams, this.density.n, n, 0);
    this.writeParams(this.ensembleParams, this.ensemble.n, n, Math.min(TRACK, this.ensemble.n));
    const pass = enc.beginComputePass({ label: "chaos-steps", timestampWrites });
    pass.setPipeline(this.k.density);
    pass.setBindGroup(0, this.densityBind);
    pass.dispatchWorkgroups(Math.ceil(this.density.n / 256));
    pass.setPipeline(this.k.ensemble);
    pass.setBindGroup(0, this.ensembleBind);
    pass.dispatchWorkgroups(Math.ceil(this.ensemble.n / 256));
    pass.end();
    this.steps += n;
  }

  /** Queue the spread reduction + its readback (skips while one is in flight). */
  encodeSpread(enc: GPUCommandEncoder): boolean {
    if (this.slot.pending || !this.released) return false;
    const bind = this.device.createBindGroup({
      layout: this.k.reduce.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.reduceParams } },
        { binding: 1, resource: { buffer: this.ensemble.state } },
        { binding: 2, resource: { buffer: this.partials } },
      ],
    });
    const pass = enc.beginComputePass({ label: "spread" });
    pass.setPipeline(this.k.reduce);
    pass.setBindGroup(0, bind);
    pass.dispatchWorkgroups(this.groups);
    pass.end();
    this.slot.record(enc, this.partials);
    this.reduceT = this.tSinceRelease;
    return true;
  }

  /** Finish a queued spread reduction (after the submit). */
  async collectSpread(): Promise<SpreadSample | null> {
    const t = this.reduceT;
    const ref = [...this.ref.x] as V3;
    const buf = await this.slot.collect();
    if (!buf) return null;
    const f = new Float32Array(buf);
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let s2 = 0;
    for (let g = 0; g < this.groups; g += 1) {
      sx += f[g * 4]!;
      sy += f[g * 4 + 1]!;
      sz += f[g * 4 + 2]!;
      s2 += f[g * 4 + 3]!;
    }
    const n = this.ensemble.n;
    const m: V3 = [sx / n, sy / n, sz / n];
    const v = Math.max(s2 / n - (m[0] * m[0] + m[1] * m[1] + m[2] * m[2]), 0);
    return { t, spread: Math.sqrt(v), centre: [ref[0] + m[0], ref[1] + m[1], ref[2] + m[2]] };
  }

  /** Read every member's offset back (tests, Prove). */
  async readEnsemble(count = this.ensemble.n): Promise<Float32Array> {
    const size = Math.min(count, this.ensemble.n) * 16;
    const staging = this.device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "ensemble-read" });
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(this.ensemble.state, 0, staging, 0, size);
    this.device.queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(staging.getMappedRange().slice(0));
    staging.destroy();
    return out;
  }

  // ---------------------------------------------------------- history --

  capture(): ChaosCheckpoint {
    // the state only (a previous-frame buffer is just the velocity stretch):
    // 24 MB at T3 for both populations
    const copy = (pop: Population, label: string): Population => {
      const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
      const c: Population = { n: pop.n, state: this.device.createBuffer({ size: pop.n * 16, usage, label }), prev: pop.prev };
      const enc = this.device.createCommandEncoder({ label: "checkpoint" });
      enc.copyBufferToBuffer(pop.state, 0, c.state, 0, pop.n * 16);
      this.device.queue.submit([enc.finish()]);
      return c;
    };
    return {
      density: copy(this.density, "save-density"),
      ensemble: copy(this.ensemble, "save-ensemble"),
      ref: [...this.ref.x],
      refSteps: this.ref.steps,
      steps: this.steps,
      released: this.released,
      releaseT0: this.releaseStep,
      eps: this.eps,
      params: { ...this.params },
    };
  }

  restore(c: ChaosCheckpoint): void {
    const enc = this.device.createCommandEncoder({ label: "restore" });
    for (const [src, dst] of [
      [c.density, this.density],
      [c.ensemble, this.ensemble],
    ] as const) {
      enc.copyBufferToBuffer(src.state, 0, dst.state, 0, dst.n * 16);
      enc.copyBufferToBuffer(src.state, 0, dst.prev, 0, dst.n * 16);
    }
    this.device.queue.submit([enc.finish()]);
    this.ref = new Reference(c.ref);
    this.ref.steps = c.refSteps;
    this.prevRef = [...c.ref];
    this.steps = c.steps;
    this.released = c.released;
    this.releaseStep = c.releaseT0;
    this.eps = c.eps;
    this.params = { ...c.params };
    this.stepOrigins.length = 0;
  }

  releaseCheckpoint(c: ChaosCheckpoint): void {
    // `prev` is the live buffer (not copied): only the state copies are the checkpoint's
    for (const p of [c.density, c.ensemble]) p.state.destroy();
  }

  destroy(): void {
    for (const p of [this.density, this.ensemble]) {
      p.state.destroy();
      p.prev.destroy();
    }
    for (const b of [this.stages, this.trail, this.densityParams, this.ensembleParams, this.releaseParams, this.reduceParams, this.partials]) b.destroy();
    this.slot.destroy();
  }
}
