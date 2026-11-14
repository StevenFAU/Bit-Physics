// Flow Sculpture — the live model: the gated cross-product field
// (src/field.wgsl, v = ∇f₁ × ∇f₂ with the sphere's distance substituted into
// f₁) driving the tracers, their Silk history ring, the probe instruments
// (src/instruments.wgsl, v1's, verbatim) and checkpoints for history.
//
// One dispatch is one step. Its field uniform (time-dependent when the field
// evolves) and its live uniform ride a 256-byte-aligned ring with dynamic
// offsets, so the steps of a frame each see their own time and a replay that
// runs the same steps reproduces the same bytes however frames group them.

import fieldWgsl from "../../field.wgsl?raw";
import instrumentsWgsl from "../../instruments.wgsl?raw";
import liveWgsl from "./live.wgsl?raw";

export type V3 = [number, number, number];

/** The obstacle: a sphere (model units — the unit box the gate lives in). */
export interface Obstacle {
  centre: V3;
  radius: number;
  /** Bridson ramp width d₀. */
  ramp: number;
  /** Noise amplitude A in f₁ = d + A·ramp(d/d₀)·n₁. */
  noiseAmp: number;
}

export interface FieldParams {
  /** Largest swirl, ℓ₀ (model units). */
  ell0: number;
  octaves: number;
  gain: number;
  lacunarity: number;
  amplitude: number;
  obstacle: Obstacle | null;
  /** Domain pan per unit model time (0 = the static, gated field). */
  evolution: number;
}

/** The gated scene's field (gate-ic.json params; the live view's default). */
export const CANONICAL_FIELD: Readonly<FieldParams> = {
  ell0: 0.5,
  octaves: 3,
  gain: 0.5,
  lacunarity: 2,
  amplitude: 1,
  obstacle: { centre: [0.5, 0.5, 0.5], radius: 0.18, ramp: 0.15, noiseAmp: 1 },
  evolution: 0,
};

export function cloneField(p: FieldParams): FieldParams {
  return { ...p, obstacle: p.obstacle ? { ...p.obstacle, centre: [...p.obstacle.centre] } : null };
}

export function sameField(a: FieldParams, b: FieldParams): boolean {
  const oa = a.obstacle;
  const ob = b.obstacle;
  const obsSame =
    (oa === null && ob === null) ||
    (oa !== null &&
      ob !== null &&
      oa.radius === ob.radius &&
      oa.ramp === ob.ramp &&
      oa.noiseAmp === ob.noiseAmp &&
      oa.centre[0] === ob.centre[0] &&
      oa.centre[1] === ob.centre[1] &&
      oa.centre[2] === ob.centre[2]);
  return (
    obsSame &&
    a.ell0 === b.ell0 &&
    a.octaves === b.octaves &&
    a.gain === b.gain &&
    a.lacunarity === b.lacunarity &&
    a.amplitude === b.amplitude &&
    a.evolution === b.evolution
  );
}

/** The live field is the gated scene's field, at t = 0? */
export function isCanonical(p: FieldParams): boolean {
  return sameField({ ...p, evolution: 0 }, CANONICAL_FIELD) && p.evolution === 0;
}

/**
 * The 144-byte field uniform (field.wgsl FU), in v1's packing: obstacle,
 * ramp / noise amp / 2D z-slice / time, the FBM, the construction
 * (cross-product), and every interaction potential zero.
 */
export function packField(p: FieldParams, time: number): Float32Array<ArrayBuffer> {
  const d = new Float32Array(36);
  const o = p.obstacle;
  d.set(o ? [...o.centre, o.radius] : [0, 0, 0, 0], 0);
  d.set([o?.ramp ?? 0.15, o?.noiseAmp ?? 1.0, 0.37, time * p.evolution], 4);
  d.set([p.ell0, p.lacunarity, p.gain, p.amplitude], 8);
  d.set([0, p.octaves, 0, 0], 12);
  d.set([1, 1, 1, 0], 32);
  return d;
}

/** The flow's ball: tracers live in the shell between the obstacle and this radius. */
export const BALL_CENTRE: V3 = [0.5, 0.5, 0.5];
export const BALL_RADIUS = 0.47;
/** Inflow speed bound (per unit amplitude) for the re-entry rejection sampling. */
export const INFLOW_BOUND = 4;

export interface LiveOptions {
  dt: number;
  maxAge: number;
  respawn: boolean;
  reproject: boolean;
  seed: number;
  /** f₂ values of the sheets particles live on (1–3), or null: the whole ball. */
  sheets: readonly number[] | null;
}

/** Silk's two sheets {f₂ = c}: two cloths folding through the flow. */
export const SILK_SHEETS: readonly number[] = [-0.08, 0.08];

/** The 80-byte live uniform (live.wgsl LiveU). */
export function packLive(n: number, slot: number, slots: number, o: LiveOptions, amplitude: number): ArrayBuffer {
  const buf = new ArrayBuffer(80);
  const f = new Float32Array(buf);
  const u = new Uint32Array(buf);
  // the rejection bound for inflow sampling: about the fastest inflow speeds (|v| ≲ 4 per unit amplitude)
  f.set([o.dt, o.maxAge, INFLOW_BOUND * amplitude, BALL_RADIUS], 0);
  u.set([n, 1, slot, slots], 4);
  u.set([o.respawn ? 1 : 0, o.reproject ? 1 : 0, o.seed >>> 0, o.sheets ? 1 : 0], 8);
  f.set([...BALL_CENTRE, 0.002], 12);
  const sh = o.sheets ?? [];
  f.set([sh.length, sh[0] ?? 0, sh[1] ?? 0, sh[2] ?? 0], 16);
  return buf;
}

const SLOT = 256;
/** Most steps one encoder records (uniform ring slots). */
export const MAX_STEPS = 8;

export class FlowKernels {
  private constructor(
    readonly layout: GPUBindGroupLayout,
    readonly advect: GPUComputePipeline,
    readonly seed: GPUComputePipeline,
    readonly anchor: GPUComputePipeline,
    readonly instruments: GPUComputePipeline,
  ) {}

  static async create(device: GPUDevice): Promise<FlowKernels> {
    const module = device.createShaderModule({ code: fieldWgsl + liveWgsl, label: "flow-live" });
    const instModule = device.createShaderModule({ code: fieldWgsl + instrumentsWgsl, label: "flow-instruments" });
    const storage = (binding: number): GPUBindGroupLayoutEntry => ({ binding, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } });
    const layout = device.createBindGroupLayout({
      label: "flow-live",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 144 } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 80 } },
        storage(2),
        storage(3),
        storage(4),
        storage(5),
      ],
    });
    const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    const [advect, seed, anchor, instruments] = await Promise.all([
      device.createComputePipelineAsync({ label: "flow-advect", layout: pl, compute: { module, entryPoint: "live_advect" } }),
      device.createComputePipelineAsync({ label: "flow-seed", layout: pl, compute: { module, entryPoint: "live_seed" } }),
      device.createComputePipelineAsync({ label: "flow-anchor", layout: pl, compute: { module, entryPoint: "live_anchor" } }),
      device.createComputePipelineAsync({ label: "flow-instruments", layout: "auto", compute: { module: instModule, entryPoint: "instruments" } }),
    ]);
    return new FlowKernels(layout, advect, seed, anchor, instruments);
  }
}

export interface FlowCheckpoint {
  tracers: GPUBuffer;
  f0: GPUBuffer;
  epochs: GPUBuffer;
  params: FieldParams;
  time: number;
  steps: number;
  dt: number;
  seed: number;
}

export class Flow {
  readonly n: number;
  readonly slots: number;
  readonly tracers: GPUBuffer;
  readonly f0: GPUBuffer;
  readonly epochs: GPUBuffer;
  /** Silk history: slots × n vec4 (xyz, w = epoch + life fraction). */
  readonly ring: GPUBuffer;
  private readonly fu: GPUBuffer;
  private readonly lu: GPUBuffer;
  private readonly bind: GPUBindGroup;
  params: FieldParams;
  /** Model time (Σ dt) — the field's clock when it evolves. */
  time = 0;
  steps = 0;
  dt = 0.0012;
  maxAge = 0.5;
  seed = 1;
  respawn = true;
  /** Silk's sheets, or null for the whole ball. */
  sheets: readonly number[] | null = SILK_SHEETS;
  /** Newest ring slot, and how many slots hold history since the last reset. */
  head = 0;
  valid = 0;

  constructor(
    private readonly device: GPUDevice,
    private readonly k: FlowKernels,
    n: number,
    slots: number,
    params: FieldParams,
  ) {
    this.n = n;
    this.slots = Math.max(0, slots);
    this.params = cloneField(params);
    const st = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    this.tracers = device.createBuffer({ size: n * 16, usage: st, label: "flow-tracers" });
    this.f0 = device.createBuffer({ size: n * 8, usage: st, label: "flow-f0" });
    this.epochs = device.createBuffer({ size: Math.max(16, n * 4), usage: st, label: "flow-epochs" });
    this.ring = device.createBuffer({ size: Math.max(16, n * Math.max(this.slots, 1) * 16), usage: st, label: "flow-ring" });
    this.fu = device.createBuffer({ size: SLOT * MAX_STEPS, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "flow-fu" });
    this.lu = device.createBuffer({ size: SLOT * MAX_STEPS, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "flow-lu" });
    this.bind = device.createBindGroup({
      label: "flow-live",
      layout: k.layout,
      entries: [
        { binding: 0, resource: { buffer: this.fu, size: 144 } },
        { binding: 1, resource: { buffer: this.lu, size: 80 } },
        { binding: 2, resource: { buffer: this.tracers } },
        { binding: 3, resource: { buffer: this.f0 } },
        { binding: 4, resource: { buffer: this.ring } },
        { binding: 5, resource: { buffer: this.epochs } },
      ],
    });
  }

  /** Reproject onto the iso-surfaces only while the field holds still (the anchors are its values). */
  get reproject(): boolean {
    return this.params.evolution === 0;
  }

  private options(): LiveOptions {
    return { dt: this.dt, maxAge: this.maxAge, respawn: this.respawn, reproject: this.reproject, seed: this.seed, sheets: this.sheets };
  }

  private writeSlot(s: number, time: number, ringSlot: number): void {
    this.device.queue.writeBuffer(this.fu, s * SLOT, packField(this.params, time));
    this.device.queue.writeBuffer(this.lu, s * SLOT, packLive(this.n, ringSlot, this.slots, this.options(), this.params.amplitude));
  }

  private dispatch(enc: GPUCommandEncoder, pipe: GPUComputePipeline, s: number, timestampWrites?: GPUComputePassTimestampWrites): void {
    const pass = enc.beginComputePass({ label: "flow", timestampWrites });
    pass.setPipeline(pipe);
    pass.setBindGroup(0, this.bind, [s * SLOT, s * SLOT]);
    pass.dispatchWorkgroups(Math.ceil(this.n / 256));
    pass.end();
  }

  /** Seed every tracer in the shell (scene start); the ribbons start empty. */
  encodeSeed(enc: GPUCommandEncoder, seed: number): void {
    this.seed = seed >>> 0;
    this.time = 0;
    this.steps = 0;
    this.writeSlot(0, 0, 0);
    this.dispatch(enc, this.k.seed, 0);
    this.head = 0;
    this.valid = 0;
  }

  /** Re-anchor the iso values at the tracers' positions (after a field change). */
  encodeAnchor(enc: GPUCommandEncoder): void {
    this.writeSlot(0, this.time, this.head);
    this.dispatch(enc, this.k.anchor, 0);
  }

  /**
   * Record `k` steps (≤ MAX_STEPS) into `enc`. Uniforms are queue writes, so
   * one encoder records one call (submit it before the next).
   */
  encodeSteps(enc: GPUCommandEncoder, k: number, timestampWrites?: GPUComputePassTimestampWrites): void {
    const n = Math.min(k, MAX_STEPS);
    for (let s = 0; s < n; s += 1) {
      const slot = this.slots > 0 ? (this.head + 1) % this.slots : 0;
      this.writeSlot(s, this.time, slot);
      // timestamps on the first pass only (the profiler tags the frame's steps)
      this.dispatch(enc, this.k.advect, s, s === 0 ? timestampWrites : undefined);
      this.head = slot;
      this.valid = Math.min(this.slots, this.valid + 1);
      this.time += this.dt;
      this.steps += 1;
    }
  }

  /** Forget the ribbons' history (restore, undo): they regrow from the current positions. */
  clearHistory(): void {
    this.valid = 0;
  }

  // ---------------------------------------------------------- history --

  capture(): FlowCheckpoint {
    const mk = (size: number, label: string): GPUBuffer =>
      this.device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, label });
    const c: FlowCheckpoint = {
      tracers: mk(this.n * 16, "flow-ckpt-tracers"),
      f0: mk(this.n * 8, "flow-ckpt-f0"),
      epochs: mk(Math.max(16, this.n * 4), "flow-ckpt-epochs"),
      params: cloneField(this.params),
      time: this.time,
      steps: this.steps,
      dt: this.dt,
      seed: this.seed,
    };
    const enc = this.device.createCommandEncoder({ label: "flow-capture" });
    enc.copyBufferToBuffer(this.tracers, 0, c.tracers, 0, this.n * 16);
    enc.copyBufferToBuffer(this.f0, 0, c.f0, 0, this.n * 8);
    enc.copyBufferToBuffer(this.epochs, 0, c.epochs, 0, Math.max(16, this.n * 4));
    this.device.queue.submit([enc.finish()]);
    return c;
  }

  restore(c: FlowCheckpoint): void {
    const enc = this.device.createCommandEncoder({ label: "flow-restore" });
    enc.copyBufferToBuffer(c.tracers, 0, this.tracers, 0, this.n * 16);
    enc.copyBufferToBuffer(c.f0, 0, this.f0, 0, this.n * 8);
    enc.copyBufferToBuffer(c.epochs, 0, this.epochs, 0, Math.max(16, this.n * 4));
    this.device.queue.submit([enc.finish()]);
    this.params = cloneField(c.params);
    this.time = c.time;
    this.steps = c.steps;
    this.dt = c.dt;
    this.seed = c.seed;
    this.clearHistory();
  }

  releaseCheckpoint(c: FlowCheckpoint): void {
    c.tracers.destroy();
    c.f0.destroy();
    c.epochs.destroy();
  }

  /** Read back the first `count` tracers (xyz, age) — tests, Prove. */
  async readTracers(count = this.n): Promise<Float32Array<ArrayBuffer>> {
    const bytes = Math.min(count, this.n) * 16;
    const staging = this.device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "flow-read" });
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(this.tracers, 0, staging, 0, bytes);
    this.device.queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(staging.getMappedRange().slice(0));
    staging.destroy();
    return out;
  }

  /** Read back the first `count` iso anchors (f₁, f₂). */
  async readAnchors(count = this.n): Promise<Float32Array<ArrayBuffer>> {
    const bytes = Math.min(count, this.n) * 8;
    const staging = this.device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "flow-read-f0" });
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(this.f0, 0, staging, 0, bytes);
    this.device.queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(staging.getMappedRange().slice(0));
    staging.destroy();
    return out;
  }

  destroy(): void {
    for (const b of [this.tracers, this.f0, this.epochs, this.ring, this.fu, this.lu]) b.destroy();
  }
}

/** The f64 mirror's config (src/curlnoise64.mjs) for a live field at model time t. */
export function mirrorConfigOf(p: FieldParams, time: number): Record<string, unknown> {
  const o = p.obstacle;
  return {
    octaves: p.octaves,
    ell0: p.ell0,
    gain: p.gain,
    lacunarity: p.lacunarity,
    amplitude: p.amplitude,
    seed: 0,
    time: time * p.evolution,
    ...(o ? { obstacleCenter: o.centre, obstacleRadius: o.radius, obstacleRampWidth: o.ramp, obstacleNoiseAmp: o.noiseAmp } : {}),
  };
}

/**
 * The release gate's observable on the live view: how far each particle has
 * left its two surfaces, ‖(f₁, f₂)(x) − anchors‖, with f recomputed in double
 * precision at the particle's single-precision position. Particles that
 * restarted since the anchors were read are skipped by the caller's age test.
 */
export function surfaceResidual(
  xyzw: Float32Array,
  anchors: Float32Array,
  p: FieldParams,
  time: number,
  isoValues: (x: number[], cfg: Record<string, unknown>) => number[],
): { worst: number; median: number; count: number } {
  const cfg = mirrorConfigOf(p, time);
  const r: number[] = [];
  const n = Math.min(xyzw.length / 4, anchors.length / 2);
  for (let i = 0; i < n; i += 1) {
    const f = isoValues([xyzw[i * 4]!, xyzw[i * 4 + 1]!, xyzw[i * 4 + 2]!], cfg);
    r.push(Math.hypot(f[0]! - anchors[i * 2]!, f[1]! - anchors[i * 2 + 1]!));
  }
  r.sort((a, b) => a - b);
  return { worst: r[r.length - 1] ?? 0, median: r[Math.floor(r.length / 2)] ?? 0, count: r.length };
}

// ------------------------------------------------------------ probes --

/** Probe points: volume probes in the flow's shell, then surface probes on the sphere. */
export const N_VOLUME_PROBES = 1024;
export const N_SURFACE_PROBES = 256;
export const N_PROBES = N_VOLUME_PROBES + N_SURFACE_PROBES;
/** InstOut, instruments.wgsl: 12 floats per probe. */
export const INST_FLOATS = 12;

/** Deterministic probe set (vec4: xyz, kind 0 volume / 1 surface) for a field. */
export function probePoints(p: FieldParams): Float32Array<ArrayBuffer> {
  const out = new Float32Array(N_PROBES * 4);
  let s = 12345;
  const rnd = (): number => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296);
  const o = p.obstacle;
  const inner = o ? o.radius + 0.01 : 0.02;
  for (let i = 0; i < N_VOLUME_PROBES; i += 1) {
    // uniform in the shell between the obstacle and the ball
    const z = 2 * rnd() - 1;
    const th = 2 * Math.PI * rnd();
    const r = Math.cbrt(inner ** 3 + (BALL_RADIUS ** 3 - inner ** 3) * rnd());
    const sz = Math.sqrt(Math.max(0, 1 - z * z));
    const c = o ? o.centre : BALL_CENTRE;
    out.set([c[0] + r * sz * Math.cos(th), c[1] + r * sz * Math.sin(th), c[2] + r * z, 0], i * 4);
  }
  for (let i = 0; i < N_SURFACE_PROBES; i += 1) {
    const th = Math.acos(2 * rnd() - 1);
    const ph = 2 * Math.PI * rnd();
    const c = o ? o.centre : BALL_CENTRE;
    const r = o ? o.radius : 0.18;
    out.set([c[0] + r * Math.sin(th) * Math.cos(ph), c[1] + r * Math.sin(th) * Math.sin(ph), c[2] + r * Math.cos(th), 1], (N_VOLUME_PROBES + i) * 4);
  }
  return out;
}

export interface Instruments {
  /** Max |∇·v| from the analytic Jacobian's trace, and its scale max ‖J‖. */
  divMax: number;
  jacScale: number;
  /** Max |v·∇f₁|, |v·∇f₂| (confinement) and |f₁∇f₂·v| (Clebsch), over volume probes. */
  conf1Max: number;
  conf2Max: number;
  clebschMax: number;
  /** Max |v| and max |v·n| on the sphere. */
  speedMax: number;
  vnMax: number;
  /** Max |v| at the surface probes. */
  surfaceSpeedMax: number;
  /** Kinetic helicity v·(∇×v) — generically nonzero (the honest control). */
  helicityMax: number;
  probes: number;
}

/** Evaluate v1's instruments kernel at the probe set; reduce on the CPU. */
export async function measureInstruments(device: GPUDevice, k: FlowKernels, params: FieldParams, time: number): Promise<Instruments> {
  const probes = probePoints(params);
  const fu = device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "inst-fu" });
  const pb = device.createBuffer({ size: probes.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "inst-probes" });
  const ob = device.createBuffer({ size: N_PROBES * INST_FLOATS * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, label: "inst-out" });
  const rb = device.createBuffer({ size: N_PROBES * INST_FLOATS * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST, label: "inst-read" });
  try {
    device.queue.writeBuffer(fu, 0, packField(params, time));
    device.queue.writeBuffer(pb, 0, probes);
    const bg = device.createBindGroup({
      layout: k.instruments.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: fu } },
        { binding: 1, resource: { buffer: pb } },
        { binding: 2, resource: { buffer: ob } },
      ],
    });
    const enc = device.createCommandEncoder({ label: "instruments" });
    const pass = enc.beginComputePass();
    pass.setPipeline(k.instruments);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(N_PROBES / 64));
    pass.end();
    enc.copyBufferToBuffer(ob, 0, rb, 0, N_PROBES * INST_FLOATS * 4);
    device.queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const d = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    const r: Instruments = { divMax: 0, jacScale: 0, conf1Max: 0, conf2Max: 0, clebschMax: 0, speedMax: 0, vnMax: 0, surfaceSpeedMax: 0, helicityMax: 0, probes: N_PROBES };
    for (let i = 0; i < N_PROBES; i += 1) {
      const o = i * INST_FLOATS;
      const surface = i >= N_VOLUME_PROBES;
      // InstOut: speed, div_trace, fd_div, conf1, conf2, clebsch, helicity, iso_resid, vn, beltrami, vort, pad
      if (!surface) {
        r.speedMax = Math.max(r.speedMax, d[o]!);
        r.divMax = Math.max(r.divMax, Math.abs(d[o + 1]!));
        r.jacScale = Math.max(r.jacScale, Math.abs(d[o + 10]!));
        r.conf1Max = Math.max(r.conf1Max, Math.abs(d[o + 3]!));
        r.conf2Max = Math.max(r.conf2Max, Math.abs(d[o + 4]!));
        r.clebschMax = Math.max(r.clebschMax, Math.abs(d[o + 5]!));
        r.helicityMax = Math.max(r.helicityMax, Math.abs(d[o + 6]!));
      } else {
        r.surfaceSpeedMax = Math.max(r.surfaceSpeedMax, d[o]!);
        r.vnMax = Math.max(r.vnMax, Math.abs(d[o + 8]!));
      }
    }
    return r;
  } finally {
    fu.destroy();
    pb.destroy();
    ob.destroy();
    rb.destroy();
  }
}

// ------------------------------------------------------------ density --

/** Equal-volume shells of the flow's ball, from the centre out. */
export const DENSITY_SHELLS = 8;

/** Which equal-volume shell of the ball a point is in (−1 = outside the ball). */
export function shellOf(x: number, y: number, z: number): number {
  const r = Math.hypot(x - BALL_CENTRE[0], y - BALL_CENTRE[1], z - BALL_CENTRE[2]);
  if (!(r <= BALL_RADIUS)) return -1;
  return Math.min(DENSITY_SHELLS - 1, Math.floor(DENSITY_SHELLS * (r / BALL_RADIUS) ** 3));
}

/**
 * The fraction of the ball's free volume (outside the obstacle) in each
 * shell: an even density puts this fraction of the particles there.
 * Monte Carlo with a fixed LCG, so it is the same on every load.
 */
export function shellFractions(o: Obstacle | null, samples = 200_000): number[] {
  const out = new Array<number>(DENSITY_SHELLS).fill(0);
  let s = 2463534242;
  const rnd = (): number => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296);
  let kept = 0;
  for (let i = 0; i < samples; i += 1) {
    const x = BALL_CENTRE[0] + BALL_RADIUS * (2 * rnd() - 1);
    const y = BALL_CENTRE[1] + BALL_RADIUS * (2 * rnd() - 1);
    const z = BALL_CENTRE[2] + BALL_RADIUS * (2 * rnd() - 1);
    const k = shellOf(x, y, z);
    if (k < 0) continue;
    if (o && Math.hypot(x - o.centre[0], y - o.centre[1], z - o.centre[2]) < o.radius) continue;
    out[k]! += 1;
    kept += 1;
  }
  return out.map((c) => c / Math.max(kept, 1));
}

/** Particles per shell from a readback of (xyz, age) vec4s. */
export function shellCounts(xyzw: Float32Array): number[] {
  const out = new Array<number>(DENSITY_SHELLS).fill(0);
  for (let i = 0; i + 3 < xyzw.length; i += 4) {
    const k = shellOf(xyzw[i]!, xyzw[i + 1]!, xyzw[i + 2]!);
    if (k >= 0) out[k]! += 1;
  }
  return out;
}
