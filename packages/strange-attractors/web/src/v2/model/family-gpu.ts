// The Family's density on the GPU (family.wgsl): the same population shape as
// the Lorenz density (state + previous state, vec4), so the view draws it the
// same way. Seeded from 4,096 points along one f64 trajectory, each fanned out
// a little and spread over the attractor by a warm-up.

import { wgsl } from "@bp/gpu";
import type { V3 } from "./lorenz.js";
import type { FamilySystem } from "./family.js";
import { familyFrame, familyTrajectory, familyWarmSteps } from "./family.js";
import src from "./family.wgsl?raw";

/** f64 seed points per population (each fans out to n / FAMILY_SEEDS points). */
export const FAMILY_SEEDS = 4096;

export class FamilyDensity {
  readonly density: { state: GPUBuffer; prev: GPUBuffer; n: number };
  sys: FamilySystem | null = null;
  params: number[] = [];
  /** The attractor's centre and RMS size (f64), for framing. */
  frame: { centre: V3; rms: number; speed: number } = { centre: [0, 0, 0], rms: 1, speed: 1 };
  /** Steps taken since seeding (the Prove check and tests read it). */
  steps = 0;
  private readonly seeds: GPUBuffer;
  private readonly uniform: GPUBuffer;
  private readonly bind: GPUBindGroup;
  private carry = 0;

  static async pipeline(device: GPUDevice): Promise<GPUComputePipeline> {
    const module = device.createShaderModule({ code: wgsl(src), label: "family" });
    return device.createComputePipelineAsync({ label: "family_step", layout: "auto", compute: { module, entryPoint: "family_step" } });
  }

  constructor(
    private readonly device: GPUDevice,
    private readonly pipe: GPUComputePipeline,
    n: number,
  ) {
    const st = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    this.density = {
      state: device.createBuffer({ size: n * 16, usage: st, label: "family-state" }),
      prev: device.createBuffer({ size: n * 16, usage: st, label: "family-prev" }),
      n,
    };
    this.seeds = device.createBuffer({ size: FAMILY_SEEDS * 16, usage: st, label: "family-seeds" });
    this.uniform = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "family-params" });
    this.bind = device.createBindGroup({
      layout: pipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 1, resource: { buffer: this.density.state } },
        { binding: 2, resource: { buffer: this.density.prev } },
        { binding: 3, resource: { buffer: this.seeds } },
      ],
    });
  }

  private write(steps: number, mode: 0 | 1, seed = 1): void {
    const s = this.sys!;
    const p = this.params;
    const b = new ArrayBuffer(64);
    new Float32Array(b, 0, 8).set([p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 0, p[4] ?? 0, p[5] ?? 0, s.dt, 1 / Math.max(this.frame.speed, 1e-6)]);
    // n, steps, id, mode; fan, seed; jitter
    new Uint32Array(b, 32, 6).set([this.density.n, steps, s.id, mode, Math.max(1, Math.floor(this.density.n / FAMILY_SEEDS)), seed >>> 0]);
    new Float32Array(b, 56, 2).set([1e-3 * this.frame.rms, 0]);
    this.device.queue.writeBuffer(this.uniform, 0, b);
  }

  private dispatch(enc: GPUCommandEncoder, timestampWrites?: GPUComputePassTimestampWrites): void {
    const pass = enc.beginComputePass({ label: "family", timestampWrites });
    pass.setPipeline(this.pipe);
    pass.setBindGroup(0, this.bind);
    pass.dispatchWorkgroups(Math.ceil(this.density.n / 256));
    pass.end();
  }

  /**
   * Show `sys` at `params`: frame it from an f64 run, seed the population from
   * that run and warm it up (~20 of its time units) so it covers the attractor.
   */
  set(sys: FamilySystem, params: readonly number[], seed = 1): void {
    this.sys = sys;
    this.params = [...params];
    const warm = Math.round(200 / sys.dt);
    // seeds spread over up to 2,000 of the system's time units (at most 50 steps apart): slow-mixing systems
    // (Four-wing, Sprott-A's chaotic sea) need the whole attractor in the seeds, not a stretch of it
    const every = Math.max(7, Math.min(50, Math.ceil(2000 / (sys.dt * FAMILY_SEEDS))));
    const pts = familyTrajectory(sys, params, FAMILY_SEEDS, every, Math.min(warm, 40000));
    this.frame = familyFrame(sys, params, pts);
    const f = new Float32Array(FAMILY_SEEDS * 4);
    for (let i = 0; i < FAMILY_SEEDS; i += 1) f.set([pts[i * 3]!, pts[i * 3 + 1]!, pts[i * 3 + 2]!, 0], i * 4);
    this.device.queue.writeBuffer(this.seeds, 0, f);
    let enc = this.device.createCommandEncoder({ label: "family-seed" });
    this.write(0, 1, seed);
    this.dispatch(enc);
    this.device.queue.submit([enc.finish()]);
    const total = familyWarmSteps(sys);
    for (let done = 0; done < total; done += 100) {
      enc = this.device.createCommandEncoder({ label: "family-warm" });
      this.write(Math.min(100, total - done), 0);
      this.dispatch(enc);
      this.device.queue.submit([enc.finish()]);
    }
    this.steps = 0;
    this.carry = 0;
  }

  /**
   * Advance by the share of `lorenzSteps` (the clock's steps at Lorenz's
   * 2.4 time units a second) that gives this system its own tempo.
   */
  encodeSteps(enc: GPUCommandEncoder, lorenzSteps: number, timestampWrites?: GPUComputePassTimestampWrites): number {
    const s = this.sys;
    if (!s || lorenzSteps <= 0) return 0;
    this.carry += (lorenzSteps * s.tempo) / (240 * s.dt);
    const n = Math.min(Math.floor(this.carry), 64);
    this.carry -= Math.floor(this.carry);
    if (n <= 0) return 0;
    this.write(n, 0);
    this.dispatch(enc, timestampWrites);
    this.steps += n;
    return n;
  }

  /** Step a fixed number of the system's own steps (Prove). */
  encodeRaw(enc: GPUCommandEncoder, steps: number): void {
    this.write(steps, 0);
    this.dispatch(enc);
    this.steps += steps;
  }

  destroy(): void {
    for (const b of [this.density.state, this.density.prev, this.seeds, this.uniform]) b.destroy();
  }
}
