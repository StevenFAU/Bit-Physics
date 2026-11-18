// Paint the Stream — the 2D model: ψ on a periodic N×N grid (cells² / s),
// particles riding its contours, brush dabs, checkpoints and the Prove probes
// (paint.wgsl). Every dispatch's uniforms ride a 256-byte-aligned ring with
// dynamic offsets, so a frame can record several dabs and steps in one
// encoder without the later ones overwriting the earlier ones' uniforms.

import paintWgsl from "./paint.wgsl?raw";

/** A brush dab: raise or lower ψ by `amount` at its centre, or smooth it. */
export interface Dab {
  x: number;
  y: number;
  /** Radius, cells. */
  radius: number;
  /** ψ change at the centre (raise > 0, lower < 0); smoothing strength for "smooth". */
  amount: number;
  mode: "raise" | "smooth";
}

const SLOT = 256;
/** Most dabs + step dispatches one encoder records. */
export const MAX_DISPATCHES = 24;
export const N_PROBES = 2048;

export class PaintKernels {
  private constructor(
    readonly layout: GPUBindGroupLayout,
    readonly advect: GPUComputePipeline,
    readonly seed: GPUComputePipeline,
    readonly anchor: GPUComputePipeline,
    readonly stamp: GPUComputePipeline,
    readonly probe: GPUComputePipeline,
  ) {}

  static async create(device: GPUDevice): Promise<PaintKernels> {
    const module = device.createShaderModule({ code: paintWgsl, label: "paint" });
    const st = (binding: number, type: GPUBufferBindingType = "storage"): GPUBindGroupLayoutEntry => ({ binding, visibility: GPUShaderStage.COMPUTE, buffer: { type } });
    const layout = device.createBindGroupLayout({
      label: "paint",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 64 } },
        st(1),
        st(2),
        st(3),
        st(4),
        st(5, "read-only-storage"),
        st(6),
      ],
    });
    const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    const mk = (entryPoint: string): Promise<GPUComputePipeline> => device.createComputePipelineAsync({ label: `paint-${entryPoint}`, layout: pl, compute: { module, entryPoint } });
    const [advect, seed, anchor, stamp, probe] = await Promise.all([mk("advect"), mk("seed"), mk("anchor"), mk("stamp"), mk("probe")]);
    return new PaintKernels(layout, advect, seed, anchor, stamp, probe);
  }
}

/** The landscape seed of flat ground (ψ ≡ 0): nothing flows until you paint. */
export const FLAT_GROUND = -1;

/** The landscape for a seed: flat ground for FLAT_GROUND (or any negative seed), else `landscape(n, seed)`. */
export function landscapeFor(n: number, seed: number): Float32Array<ArrayBuffer> {
  return seed < 0 ? new Float32Array(n * n) : landscape(n, seed);
}

/**
 * The starting landscape: hills and valleys, each a periodic Gaussian
 * Σ_m exp(−(d + mN)² / σ²) per axis (separable), from a seeded LCG. Built on
 * the CPU in double precision, stored as f32. Amplitudes scale with N² so the
 * flow's speed is the same fraction of the map at every grid size.
 */
export function landscape(n: number, seed: number, blobs = 11): Float32Array<ArrayBuffer> {
  let s = (seed * 2654435761 + 12345) >>> 0;
  const rnd = (): number => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296);
  const out = new Float64Array(n * n);
  const a0 = LANDSCAPE_AMPLITUDE * n * n;
  const gx = new Float64Array(n);
  const gy = new Float64Array(n);
  for (let b = 0; b < blobs; b += 1) {
    const cx = rnd() * n;
    const cy = rnd() * n;
    const sig = (0.07 + 0.09 * rnd()) * n;
    const amp = (rnd() < 0.5 ? -1 : 1) * a0 * (0.55 + 0.45 * rnd());
    const g = (c: number, arr: Float64Array): void => {
      for (let i = 0; i < n; i += 1) {
        let v = 0;
        for (let m = -1; m <= 1; m += 1) {
          const d = i - c + m * n;
          v += Math.exp(-(d * d) / (sig * sig));
        }
        arr[i] = v;
      }
    };
    g(cx, gx);
    g(cy, gy);
    for (let j = 0; j < n; j += 1) {
      const a = amp * gy[j]!;
      const row = j * n;
      for (let i = 0; i < n; i += 1) out[row + i]! += a * gx[i]!;
    }
  }
  return Float32Array.from(out);
}

/** A hill's height, as a fraction of N² (cells² / s): speeds of ~8% of the map per second. */
export const LANDSCAPE_AMPLITUDE = 0.0095;

export interface PaintCheckpoint {
  psi: GPUBuffer;
  parts: GPUBuffer;
  restarts: GPUBuffer;
  steps: number;
  time: number;
  dt: number;
  seed: number;
  /** The landscape the map was started from (the share link's seed). */
  landscapeSeed: number;
}

export class Paint {
  readonly n: number;
  readonly count: number;
  readonly psi: GPUBuffer;
  readonly psiTmp: GPUBuffer;
  /** Staging for a new landscape, copied into ψ in encoder order. */
  private readonly psiLoad: GPUBuffer;
  readonly parts: GPUBuffer;
  readonly restarts: GPUBuffer;
  private readonly probes: GPUBuffer;
  private readonly probeOut: GPUBuffer;
  private readonly uni: GPUBuffer;
  private readonly bind: GPUBindGroup;
  steps = 0;
  time = 0;
  dt = 1 / 60;
  /** Lifetime of a particle, seconds of model time. */
  life = 7;
  seed = 1;
  reproject = true;
  /** The landscape this map started from (its seed). */
  landscapeSeed = 1;
  private slot = 0;

  constructor(
    private readonly device: GPUDevice,
    private readonly k: PaintKernels,
    n: number,
    count: number,
  ) {
    this.n = n;
    this.count = count;
    const st = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    this.psi = device.createBuffer({ size: n * n * 4, usage: st, label: "paint-psi" });
    this.psiTmp = device.createBuffer({ size: n * n * 4, usage: st, label: "paint-psi-tmp" });
    this.psiLoad = device.createBuffer({ size: n * n * 4, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, label: "paint-psi-load" });
    this.parts = device.createBuffer({ size: count * 16, usage: st, label: "paint-parts" });
    this.restarts = device.createBuffer({ size: Math.max(16, count * 4), usage: st, label: "paint-restarts" });
    this.probes = device.createBuffer({ size: N_PROBES * 8, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "paint-probes" });
    this.probeOut = device.createBuffer({ size: N_PROBES * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, label: "paint-probe-out" });
    this.uni = device.createBuffer({ size: SLOT * MAX_DISPATCHES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "paint-uniforms" });
    this.bind = device.createBindGroup({
      label: "paint",
      layout: k.layout,
      entries: [
        { binding: 0, resource: { buffer: this.uni, size: 64 } },
        { binding: 1, resource: { buffer: this.psi } },
        { binding: 2, resource: { buffer: this.psiTmp } },
        { binding: 3, resource: { buffer: this.parts } },
        { binding: 4, resource: { buffer: this.restarts } },
        { binding: 5, resource: { buffer: this.probes } },
        { binding: 6, resource: { buffer: this.probeOut } },
      ],
    });
  }

  /** Begin a new encoder's worth of dispatches (the uniform ring starts over). */
  begin(): void {
    this.slot = 0;
  }

  private dispatch(enc: GPUCommandEncoder, pipe: GPUComputePipeline, u: Float32Array, groups: [number, number], timestampWrites?: GPUComputePassTimestampWrites): void {
    if (this.slot >= MAX_DISPATCHES) throw new Error("paint: too many dispatches in one encoder");
    this.device.queue.writeBuffer(this.uni, this.slot * SLOT, u);
    const pass = enc.beginComputePass({ label: "paint", timestampWrites });
    pass.setPipeline(pipe);
    pass.setBindGroup(0, this.bind, [this.slot * SLOT]);
    pass.dispatchWorkgroups(groups[0], groups[1]);
    pass.end();
    this.slot += 1;
  }

  private uniform(steps: number, dab?: Dab): Float32Array {
    const buf = new ArrayBuffer(64);
    new Uint32Array(buf, 0, 4).set([this.n, this.count, this.seed >>> 0, steps]);
    const f = new Float32Array(buf, 16, 12);
    f.set([this.dt, this.life, this.reproject ? 1 : 0, 0], 0);
    if (dab) {
      f.set([dab.x, dab.y, dab.radius, dab.mode === "raise" ? dab.amount : 0], 4);
      f.set([dab.mode === "smooth" ? 1 : 0, dab.mode === "smooth" ? dab.amount : 0, 0, 0], 8);
    }
    return new Float32Array(buf);
  }

  private particles(): [number, number] {
    return [Math.ceil(this.count / 256), 1];
  }

  /** Upload a landscape and seed the particles on it (scene start). */
  load(psi: Float32Array, seed: number): void {
    this.device.queue.writeBuffer(this.psi, 0, psi);
    this.seed = seed >>> 0;
    this.steps = 0;
    this.time = 0;
    this.begin();
    const enc = this.device.createCommandEncoder({ label: "paint-seed" });
    this.dispatch(enc, this.k.seed, this.uniform(0), this.particles());
    this.device.queue.submit([enc.finish()]);
  }

  /** Record dabs into `enc` (each re-anchors the particles to the new contours). */
  encodeDabs(enc: GPUCommandEncoder, dabs: readonly Dab[]): void {
    if (dabs.length === 0) return;
    for (const d of dabs) {
      this.dispatch(enc, this.k.stamp, this.uniform(0, d), [Math.ceil(this.n / 16), Math.ceil(this.n / 16)]);
      enc.copyBufferToBuffer(this.psiTmp, 0, this.psi, 0, this.n * this.n * 4);
    }
    this.dispatch(enc, this.k.anchor, this.uniform(0), this.particles());
  }

  /** Re-anchor every particle to the contour through where it is. */
  encodeAnchor(enc: GPUCommandEncoder): void {
    this.dispatch(enc, this.k.anchor, this.uniform(0), this.particles());
  }

  /**
   * Replace ψ with a new landscape inside `enc` (one per encoder: the data is
   * staged with a queue write, then copied in encoder order) and re-anchor.
   */
  encodeLandscape(enc: GPUCommandEncoder, psi: Float32Array): void {
    this.device.queue.writeBuffer(this.psiLoad, 0, psi);
    enc.copyBufferToBuffer(this.psiLoad, 0, this.psi, 0, this.n * this.n * 4);
    this.encodeAnchor(enc);
  }

  /** Record `k` steps in one dispatch (ψ holds still within a frame). */
  encodeSteps(enc: GPUCommandEncoder, k: number, timestampWrites?: GPUComputePassTimestampWrites): void {
    if (k <= 0) return;
    this.dispatch(enc, this.k.advect, this.uniform(k), this.particles(), timestampWrites);
    this.steps += k;
    this.time += k * this.dt;
  }

  // ---------------------------------------------------------- history --

  capture(): PaintCheckpoint {
    const mk = (size: number, label: string): GPUBuffer =>
      this.device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, label });
    const c: PaintCheckpoint = {
      psi: mk(this.n * this.n * 4, "paint-ckpt-psi"),
      parts: mk(this.count * 16, "paint-ckpt-parts"),
      restarts: mk(Math.max(16, this.count * 4), "paint-ckpt-restarts"),
      steps: this.steps,
      time: this.time,
      dt: this.dt,
      seed: this.seed,
      landscapeSeed: this.landscapeSeed,
    };
    const enc = this.device.createCommandEncoder({ label: "paint-capture" });
    enc.copyBufferToBuffer(this.psi, 0, c.psi, 0, this.n * this.n * 4);
    enc.copyBufferToBuffer(this.parts, 0, c.parts, 0, this.count * 16);
    enc.copyBufferToBuffer(this.restarts, 0, c.restarts, 0, Math.max(16, this.count * 4));
    this.device.queue.submit([enc.finish()]);
    return c;
  }

  restore(c: PaintCheckpoint): void {
    const enc = this.device.createCommandEncoder({ label: "paint-restore" });
    enc.copyBufferToBuffer(c.psi, 0, this.psi, 0, this.n * this.n * 4);
    enc.copyBufferToBuffer(c.parts, 0, this.parts, 0, this.count * 16);
    enc.copyBufferToBuffer(c.restarts, 0, this.restarts, 0, Math.max(16, this.count * 4));
    this.device.queue.submit([enc.finish()]);
    this.steps = c.steps;
    this.time = c.time;
    this.dt = c.dt;
    this.seed = c.seed;
    this.landscapeSeed = c.landscapeSeed;
  }

  releaseCheckpoint(c: PaintCheckpoint): void {
    c.psi.destroy();
    c.parts.destroy();
    c.restarts.destroy();
  }

  // ---------------------------------------------------------- readback --

  private async read(src: GPUBuffer, bytes: number): Promise<Float32Array<ArrayBuffer>> {
    const staging = this.device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "paint-read" });
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(src, 0, staging, 0, bytes);
    this.device.queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(staging.getMappedRange().slice(0));
    staging.destroy();
    return out;
  }

  /** The first `count` particles: x, y (cells), ψ₀, age. */
  readParticles(count = this.count): Promise<Float32Array<ArrayBuffer>> {
    return this.read(this.parts, Math.min(count, this.count) * 16);
  }

  /** The whole ψ grid (row-major, f32). */
  readPsi(): Promise<Float32Array<ArrayBuffer>> {
    return this.read(this.psi, this.n * this.n * 4);
  }

  /**
   * The Prove probes at N_PROBES deterministic points: per point the
   * divergence (two summation orders), the size of its summed terms, v·∇ψ and |v|.
   */
  async measureProbes(): Promise<Float32Array<ArrayBuffer>> {
    const pts = new Float32Array(N_PROBES * 2);
    let s = 7919;
    const rnd = (): number => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296);
    for (let i = 0; i < N_PROBES * 2; i += 1) pts[i] = rnd() * this.n;
    this.device.queue.writeBuffer(this.probes, 0, pts);
    this.begin();
    const enc = this.device.createCommandEncoder({ label: "paint-probe" });
    this.dispatch(enc, this.k.probe, this.uniform(0), [Math.ceil(N_PROBES / 64), 1]);
    this.device.queue.submit([enc.finish()]);
    return this.read(this.probeOut, N_PROBES * 16);
  }

  destroy(): void {
    for (const b of [this.psi, this.psiTmp, this.psiLoad, this.parts, this.restarts, this.probes, this.probeOut, this.uni]) b.destroy();
  }
}

// ------------------------------------------------- CPU mirror (tests, Prove) --

/** Uniform cubic B-spline weights at t ∈ [0, 1). */
export function bsplineWeights(t: number): [number, number, number, number] {
  const s = 1 - t;
  return [(s * s * s) / 6, (3 * t * t * t - 6 * t * t + 4) / 6, (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6, (t * t * t) / 6];
}

/** ψ at a point (cells) from a grid, in double precision (the B-spline paint.wgsl evaluates). */
export function psiAt(grid: ArrayLike<number>, n: number, x: number, y: number): number {
  const px = x - n * Math.floor(x / n);
  const py = y - n * Math.floor(y / n);
  const cx = Math.floor(px);
  const cy = Math.floor(py);
  const wx = bsplineWeights(px - cx);
  const wy = bsplineWeights(py - cy);
  let v = 0;
  for (let j = 0; j < 4; j += 1) {
    const jj = (((cy - 1 + j) % n) + n) % n;
    for (let i = 0; i < 4; i += 1) {
      const ii = (((cx - 1 + i) % n) + n) % n;
      v += wy[j]! * wx[i]! * grid[jj * n + ii]!;
    }
  }
  return v;
}

/** Particles per block of a b×b grid over the torus (an even scatter: about count / b² each). */
export function blockCounts(parts: ArrayLike<number>, n: number, b: number): number[] {
  const out = new Array<number>(b * b).fill(0);
  for (let i = 0; i + 3 < parts.length; i += 4) {
    const x = Math.min(b - 1, Math.max(0, Math.floor((parts[i]! / n) * b)));
    const y = Math.min(b - 1, Math.max(0, Math.floor((parts[i + 1]! / n) * b)));
    out[y * b + x]! += 1;
  }
  return out;
}

/**
 * How far particles have left their contours: |ψ(x) − ψ₀| with ψ recomputed
 * in double precision (the same B-spline) at each particle's f32 position.
 */
export function contourResidual(psi: ArrayLike<number>, n: number, parts: ArrayLike<number>): { worst: number; median: number; count: number } {
  const r: number[] = [];
  for (let i = 0; i + 3 < parts.length; i += 4) r.push(Math.abs(psiAt(psi, n, parts[i]!, parts[i + 1]!) - parts[i + 2]!));
  r.sort((a, b) => a - b);
  return { worst: r[r.length - 1] ?? 0, median: r[Math.floor(r.length / 2)] ?? 0, count: r.length };
}

/** Particles per patch of a b×b grid: mean, relative spread, and a random scatter's (1/√mean). */
export function patchSpread(parts: ArrayLike<number>, n: number, b = 8): { perPatch: number; spread: number; expected: number } {
  const c = blockCounts(parts, n, b);
  const mean = c.reduce((x, y) => x + y, 0) / c.length;
  const sd = Math.sqrt(c.reduce((x, y) => x + (y - mean) ** 2, 0) / c.length);
  return { perPatch: mean, spread: sd / Math.max(mean, 1e-9), expected: 1 / Math.sqrt(Math.max(mean, 1e-9)) };
}

/**
 * The Prove probes reduced: the divergence against the size of the terms it
 * sums (the f32 yardstick), and v·∇ψ against |v|².
 */
export function probeStats(out: ArrayLike<number>): { divMax: number; termMax: number; divRel: number; alongMax: number; speedMax: number; alongRel: number } {
  let divMax = 0;
  let termMax = 0;
  let divRel = 0;
  let alongMax = 0;
  let speedMax = 0;
  for (let i = 0; i + 3 < out.length; i += 4) {
    divMax = Math.max(divMax, Math.abs(out[i]!));
    termMax = Math.max(termMax, Math.abs(out[i + 1]!));
    divRel = Math.max(divRel, Math.abs(out[i]!) / Math.max(Math.abs(out[i + 1]!), 1e-30));
    alongMax = Math.max(alongMax, Math.abs(out[i + 2]!));
    speedMax = Math.max(speedMax, Math.abs(out[i + 3]!));
  }
  return { divMax, termMax, divRel, alongMax, speedMax, alongRel: alongMax / Math.max(speedMax * speedMax, 1e-30) };
}
