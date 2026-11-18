// pbmpm.ts — GPU orchestration for the 3D PB-MPM spike (rebuild-v2 Materials M0).
// WGSL: packages/mpm-multimaterial/src/mpm_prelude.wgsl (read-only reuse of
// svd3) + ./pbmpm3d.wgsl. Not the M1 page and not the gated path.

import preludeWgsl from "../../src/mpm_prelude.wgsl?raw";
import pbWgsl from "./pbmpm3d.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

export const FLOATS_PER_PARTICLE = 36; // 144 bytes
export const SLOT = 256; // dynamic-offset uniform slot

export const MODEL = { water: 0, jelly: 1, sand: 2, snow: 3, clay: 4, honey: 5, snowmls: 6 } as const;

export interface Mat {
  model: number;
  stiffness: number;
  ratio: number;
  viscosity: number;
  relaxVol: number;
  yieldR: number;
  thetaC: number;
  thetaS: number;
  xi: number;
  dpAlpha: number;
  lamOverMu: number;
  maxStiffness: number;
  density: number;
  color: [number, number, number];
}

export interface ColliderState {
  kind: 0 | 1 | 2;
  friction: number;
  radius: number;
  center: [number, number, number];
  half: [number, number, number];
  disp: [number, number, number];
}

export interface StepPlan {
  substeps: number;
  iterations: number;
  dt: number;
  gravity: number;
  /** sim time at the start of the frame */
  time: number;
  /** collider states for substep s (end-of-substep centre + displacement) */
  colliders: (s: number, tStart: number, dt: number) => ColliderState[];
}

const STAT_SLOTS = 16;
const FLT_MAX_BITS = 0x7f7fffff;

export class PbMpm {
  readonly device: GPUDevice;
  readonly grid: [number, number, number];
  readonly maxParticles: number;
  readonly cells: number;
  n = 0;
  fpScale = 4e6;
  guard = 3;
  wallFriction = 0.5;
  speedThresh = 1e9;

  readonly particleBuf: GPUBuffer;
  readonly gridQ: GPUBuffer;
  readonly gridD: GPUBuffer;
  readonly statsBuf: GPUBuffer;
  readonly flagsBuf: GPUBuffer;
  readonly workBuf: GPUBuffer;
  /** work items for the tiled pass; 0 = untiled (one thread per particle) */
  workCount = 0;
  private readonly paramsBuf: GPUBuffer;
  private readonly stepBuf: GPUBuffer;
  private readonly stepSlots: number;
  private readonly matsBuf: GPUBuffer;
  private readonly bgl: GPUBindGroupLayout;
  private readonly bg: GPUBindGroup;
  private readonly pipes: Record<string, GPUComputePipeline> = {};

  // timestamps
  readonly hasTs: boolean;
  private readonly qs: GPUQuerySet | null;
  private readonly qsCount = 4096;

  // render
  private renderPipes: { particle: GPURenderPipeline; floor: GPURenderPipeline; collider: GPURenderPipeline } | null = null;
  private camBuf: GPUBuffer | null = null;
  private colorBuf: GPUBuffer | null = null;
  private colBuf: GPUBuffer | null = null;
  private renderBg: GPUBindGroup | null = null;
  private depth: GPUTexture | null = null;
  mats: Mat[] = [];

  constructor(device: GPUDevice, grid: [number, number, number], maxParticles: number) {
    this.device = device;
    this.grid = grid;
    this.maxParticles = maxParticles;
    this.cells = grid[0] * grid[1] * grid[2];
    const mk = (label: string, size: number, usage: GPUBufferUsageFlags) => device.createBuffer({ label, size, usage });
    const S = GPUBufferUsage;
    this.particleBuf = mk("particles", maxParticles * FLOATS_PER_PARTICLE * 4, S.STORAGE | S.COPY_DST | S.COPY_SRC);
    this.gridQ = mk("grid_q", this.cells * 16, S.STORAGE | S.COPY_SRC | S.COPY_DST);
    this.gridD = mk("grid_d", this.cells * 16, S.STORAGE | S.COPY_SRC);
    this.statsBuf = mk("stats", STAT_SLOTS * 4, S.STORAGE | S.COPY_SRC | S.COPY_DST);
    const nb = (this.cells / 64) + (this.cells / 512);
    this.flagsBuf = mk("flags", Math.ceil(nb) * 4 + 16, S.STORAGE | S.COPY_DST);
    this.paramsBuf = mk("params", 48, S.UNIFORM | S.COPY_DST);
    this.workBuf = mk("work", Math.ceil(maxParticles / 32) * 16 + 16 * 4096, S.STORAGE | S.COPY_DST);
    this.stepSlots = 512;
    this.stepBuf = mk("step", SLOT * this.stepSlots, S.UNIFORM | S.COPY_DST);
    this.matsBuf = mk("mats", 8 * 48, S.UNIFORM | S.COPY_DST);

    const module = device.createShaderModule({ label: "pbmpm3d", code: `${preludeWgsl}\n${pbWgsl}` });
    const C = GPUShaderStage.COMPUTE;
    this.bgl = device.createBindGroupLayout({
      label: "pbmpm",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform" } },
        { binding: 1, visibility: C, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 160 } },
        { binding: 2, visibility: C, buffer: { type: "uniform" } },
        { binding: 3, visibility: C, buffer: { type: "storage" } },
        { binding: 4, visibility: C, buffer: { type: "storage" } },
        { binding: 5, visibility: C, buffer: { type: "storage" } },
        { binding: 6, visibility: C, buffer: { type: "storage" } },
        { binding: 7, visibility: C, buffer: { type: "storage" } },
        { binding: 8, visibility: C, buffer: { type: "read-only-storage" } },
      ],
    });
    const layout = device.createPipelineLayout({ bindGroupLayouts: [this.bgl] });
    for (const e of ["grid_update", "particle_iter", "particle_iter_tiled", "particle_stats", "occupancy", "brick_count"]) {
      this.pipes[e] = device.createComputePipeline({ label: e, layout, compute: { module, entryPoint: e } });
    }
    for (const e of ["particle_iter", "particle_iter_tiled"]) {
      this.pipes[`${e}_water`] = device.createComputePipeline({ label: `${e}_water`, layout, compute: { module, entryPoint: e, constants: { SOLIDS: 0 } } });
    }
    const b = (binding: number, buffer: GPUBuffer, size?: number): GPUBindGroupEntry => ({
      binding,
      resource: size ? { buffer, size } : { buffer },
    });
    this.bg = device.createBindGroup({
      layout: this.bgl,
      entries: [
        b(0, this.paramsBuf),
        b(1, this.stepBuf, 160),
        b(2, this.matsBuf),
        b(3, this.particleBuf),
        b(4, this.gridQ),
        b(5, this.gridD),
        b(6, this.statsBuf),
        b(7, this.flagsBuf),
        b(8, this.workBuf),
      ],
    });
    this.hasTs = device.features.has("timestamp-query");
    this.qs = this.hasTs ? device.createQuerySet({ type: "timestamp", count: this.qsCount }) : null;
  }

  writeParams(): void {
    const buf = new ArrayBuffer(48);
    const u = new Uint32Array(buf);
    const f = new Float32Array(buf);
    u[0] = this.grid[0];
    u[1] = this.grid[1];
    u[2] = this.grid[2];
    u[3] = this.n;
    f[4] = this.fpScale;
    f[5] = 1 / this.fpScale;
    f[6] = this.guard;
    f[7] = this.wallFriction;
    f[8] = this.speedThresh;
    this.device.queue.writeBuffer(this.paramsBuf, 0, buf);
  }

  setMaterials(mats: Mat[]): void {
    this.mats = mats;
    const buf = new ArrayBuffer(8 * 48);
    const u = new Uint32Array(buf);
    const f = new Float32Array(buf);
    for (let i = 0; i < 8; i += 1) {
      const m = mats[Math.min(i, mats.length - 1)];
      const o = i * 12;
      u[o + 0] = m.model;
      f[o + 1] = m.stiffness;
      f[o + 2] = m.ratio;
      f[o + 3] = m.viscosity;
      f[o + 4] = m.relaxVol;
      f[o + 5] = m.yieldR;
      f[o + 6] = m.thetaC;
      f[o + 7] = m.thetaS;
      f[o + 8] = m.xi;
      f[o + 9] = m.dpAlpha;
      f[o + 10] = m.lamOverMu;
      f[o + 11] = m.maxStiffness;
    }
    this.device.queue.writeBuffer(this.matsBuf, 0, buf);
  }

  upload(data: Float32Array, count: number): void {
    if (count > this.maxParticles) throw new Error(`count ${count} > max ${this.maxParticles}`);
    this.n = count;
    this.device.queue.writeBuffer(this.particleBuf, 0, data.buffer, data.byteOffset, count * FLOATS_PER_PARTICLE * 4);
    // grid atoms start (and stay, between steps) zero
    const enc = this.device.createCommandEncoder();
    enc.clearBuffer(this.gridQ);
    this.device.queue.submit([enc.finish()]);
    this.writeParams();
  }

  private writeSlot(view: DataView, slot: number, it: number, k: number, dt: number, g: number, t: number, cols: ColliderState[]): void {
    const o = slot * SLOT;
    view.setUint32(o + 0, it, true);
    view.setUint32(o + 4, k, true);
    view.setFloat32(o + 8, dt, true);
    view.setFloat32(o + 12, g, true);
    view.setFloat32(o + 16, t, true);
    view.setUint32(o + 20, Math.min(cols.length, 2), true);
    for (let c = 0; c < Math.min(cols.length, 2); c += 1) {
      const co = o + 32 + c * 64;
      const s = cols[c];
      view.setUint32(co + 0, s.kind, true);
      view.setFloat32(co + 4, s.friction, true);
      view.setFloat32(co + 8, s.radius, true);
      for (let a = 0; a < 3; a += 1) {
        view.setFloat32(co + 16 + a * 4, s.center[a], true);
        view.setFloat32(co + 32 + a * 4, s.half[a], true);
        view.setFloat32(co + 48 + a * 4, s.disp[a], true);
      }
    }
  }

  /**
   * Encode one frame (S substeps x K iterations). Returns the number of
   * dispatch slots used. `tsMode`: "none" | "frame" (one pass, begin/end) |
   * "split" (one pass per dispatch, two queries each) — query base `qBase`.
   */
  encodeFrame(enc: GPUCommandEncoder, plan: StepPlan, tsMode: "none" | "frame" | "split" = "none", qBase = 0): { queries: number; collidersLast: ColliderState[] } {
    const K = plan.iterations;
    const slots = plan.substeps * K;
    if (slots > this.stepSlots) throw new Error("too many dispatches per frame");
    const data = new ArrayBuffer(slots * SLOT);
    const view = new DataView(data);
    let last: ColliderState[] = [];
    for (let s = 0; s < plan.substeps; s += 1) {
      const t = plan.time + s * plan.dt;
      const cols = plan.colliders(s, t, plan.dt);
      last = cols;
      for (let it = 0; it < K; it += 1) this.writeSlot(view, s * K + it, it, K, plan.dt, plan.gravity, t, cols);
    }
    this.device.queue.writeBuffer(this.stepBuf, 0, data);
    const pg = Math.ceil(this.n / 64);
    const cg = Math.ceil(this.cells / 64);
    let q = qBase;
    const ts = (): GPUComputePassTimestampWrites | undefined => {
      if (!this.qs) return undefined;
      const w = { querySet: this.qs, beginningOfPassWriteIndex: q, endOfPassWriteIndex: q + 1 };
      q += 2;
      return w;
    };
    if (tsMode === "split") {
      for (let s = 0; s < plan.substeps; s += 1) {
        for (let it = 0; it < K; it += 1) {
          const slot = (s * K + it) * SLOT;
          let pass = enc.beginComputePass({ timestampWrites: ts() });
          pass.setBindGroup(0, this.bg, [slot]);
          this.particlePass(pass, pg);
          pass.end();
          if (it < K - 1) {
            pass = enc.beginComputePass({ timestampWrites: ts() });
            pass.setBindGroup(0, this.bg, [slot]);
            pass.setPipeline(this.pipes.grid_update);
            pass.dispatchWorkgroups(cg);
            pass.end();
          }
        }
      }
    } else {
      const pass = enc.beginComputePass(tsMode === "frame" ? { timestampWrites: ts() } : {});
      for (let s = 0; s < plan.substeps; s += 1) {
        for (let it = 0; it < K; it += 1) {
          const slot = (s * K + it) * SLOT;
          pass.setBindGroup(0, this.bg, [slot]);
          this.particlePass(pass, pg);
          if (it < K - 1) {
            pass.setPipeline(this.pipes.grid_update);
            pass.dispatchWorkgroups(cg);
          }
        }
      }
      pass.end();
    }
    return { queries: q - qBase, collidersLast: last };
  }

  /** water-only probe: use the SOLIDS = false specialisation */
  waterOnly = false;

  private particlePass(pass: GPUComputePassEncoder, pg: number): void {
    const sfx = this.waterOnly ? "_water" : "";
    if (this.workCount > 0) {
      pass.setPipeline(this.pipes[`particle_iter_tiled${sfx}`]);
      pass.dispatchWorkgroups(this.workCount);
    } else {
      pass.setPipeline(this.pipes[`particle_iter${sfx}`]);
      pass.dispatchWorkgroups(pg);
    }
  }

  /** Upload a brick work list (particles must already be sorted by brick). */
  setWork(work: Uint32Array | null): void {
    if (!work) {
      this.workCount = 0;
      return;
    }
    if (work.byteLength > this.workBuf.size) throw new Error("work list too large");
    this.device.queue.writeBuffer(this.workBuf, 0, work.buffer, work.byteOffset, work.byteLength);
    this.workCount = work.length / 4;
  }

  step(plan: StepPlan): ColliderState[] {
    const enc = this.device.createCommandEncoder();
    const r = this.encodeFrame(enc, plan);
    this.device.queue.submit([enc.finish()]);
    return r.collidersLast;
  }

  private async read(src: GPUBuffer, bytes: number, offset = 0): Promise<ArrayBuffer> {
    const st = this.device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(src, offset, st, 0, bytes);
    this.device.queue.submit([enc.finish()]);
    await st.mapAsync(GPUMapMode.READ);
    const out = st.getMappedRange().slice(0);
    st.unmap();
    st.destroy();
    return out;
  }

  /** Bench: `frames` frames back to back (GPU kept busy), GPU ms per frame. */
  async bench(plan: StepPlan, frames: number, mode: "frame" | "split"): Promise<{ msPerFrame: number; particleMs?: number; gridMs?: number; frames: number }> {
    if (!this.qs) throw new Error("timestamp-query unavailable");
    const perFrame = mode === "frame" ? 2 : 2 * plan.substeps * (2 * plan.iterations - 1);
    const maxFrames = Math.max(1, Math.floor(this.qsCount / perFrame));
    const F = Math.min(frames, maxFrames);
    let q = 0;
    let t = plan.time;
    // One submit per frame, queued back to back (no CPU wait between them, so
    // the GPU stays busy and clocked up). A single 30-frame command buffer at
    // T3 was long enough to lose the device (watchdog).
    for (let f = 0; f < F; f += 1) {
      const enc = this.device.createCommandEncoder();
      const r = this.encodeFrame(enc, { ...plan, time: t }, mode, q);
      this.device.queue.submit([enc.finish()]);
      q += r.queries;
      t += plan.substeps * plan.dt;
    }
    const res = this.device.createBuffer({ size: q * 8, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
    const enc = this.device.createCommandEncoder();
    enc.resolveQuerySet(this.qs, 0, q, res, 0);
    this.device.queue.submit([enc.finish()]);
    const raw = new BigUint64Array(await this.read(res, q * 8));
    res.destroy();
    if (mode === "frame") {
      let sum = 0;
      for (let f = 0; f < F; f += 1) sum += Number(raw[2 * f + 1] - raw[2 * f]);
      return { msPerFrame: sum / F / 1e6, frames: F };
    }
    let pSum = 0;
    let gSum = 0;
    let idx = 0;
    for (let f = 0; f < F; f += 1) {
      for (let s = 0; s < plan.substeps; s += 1) {
        for (let it = 0; it < plan.iterations; it += 1) {
          pSum += Number(raw[idx + 1] - raw[idx]);
          idx += 2;
          if (it < plan.iterations - 1) {
            gSum += Number(raw[idx + 1] - raw[idx]);
            idx += 2;
          }
        }
      }
    }
    return { msPerFrame: (pSum + gSum) / F / 1e6, particleMs: pSum / F / 1e6, gridMs: gSum / F / 1e6, frames: F };
  }

  private statsInit(): Uint32Array {
    const s = new Uint32Array(STAT_SLOTS);
    s[4] = FLT_MAX_BITS;
    return s;
  }

  async stats(time: number, dt: number, gravity: number): Promise<Record<string, number>> {
    this.device.queue.writeBuffer(this.statsBuf, 0, this.statsInit());
    const data = new ArrayBuffer(SLOT);
    const view = new DataView(data);
    this.writeSlot(view, 0, 0, 2, dt, gravity, time, []);
    // use the last slot so we never clobber a frame in flight
    const slot = this.stepSlots - 1;
    this.device.queue.writeBuffer(this.stepBuf, slot * SLOT, data);
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setBindGroup(0, this.bg, [slot * SLOT]);
    pass.setPipeline(this.pipes.particle_stats);
    pass.dispatchWorkgroups(Math.ceil(this.n / 64));
    pass.end();
    this.device.queue.submit([enc.finish()]);
    const u = new Uint32Array(await this.read(this.statsBuf, STAT_SLOTS * 4));
    const f = new Float32Array(u.buffer);
    return {
      nonFinite: u[0],
      maxSpeed: f[1],
      fast: u[2],
      maxFnorm: f[3],
      minJ: u[4] === FLT_MAX_BITS ? NaN : f[4],
      nonPositiveJ: u[5],
      maxJ: f[6],
      active: u[7],
      maxPlastic: f[9],
    };
  }

  /**
   * Occupancy: one iteration-0 scatter of the current state (iteration 0 never
   * writes particles back), then count cells with mass, 4^3 / 8^3 bricks, and
   * the largest |i32 quanta| (fixed-point headroom). Leaves the grid zeroed.
   */
  async occupancy(time: number, dt: number, gravity: number): Promise<Record<string, number>> {
    this.device.queue.writeBuffer(this.statsBuf, 0, this.statsInit());
    const data = new ArrayBuffer(SLOT);
    const view = new DataView(data);
    this.writeSlot(view, 0, 0, 2, dt, gravity, time, []);
    const slot = this.stepSlots - 1;
    this.device.queue.writeBuffer(this.stepBuf, slot * SLOT, data);
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setBindGroup(0, this.bg, [slot * SLOT]);
    pass.setPipeline(this.pipes.particle_iter);
    pass.dispatchWorkgroups(Math.ceil(this.n / 64));
    pass.setPipeline(this.pipes.occupancy);
    pass.dispatchWorkgroups(Math.ceil(this.cells / 64));
    pass.setPipeline(this.pipes.brick_count);
    pass.dispatchWorkgroups(Math.ceil((this.cells / 64 + this.cells / 512) / 64));
    pass.end();
    this.device.queue.submit([enc.finish()]);
    const u = new Uint32Array(await this.read(this.statsBuf, STAT_SLOTS * 4));
    return {
      cells: this.cells,
      occupiedCells: u[10],
      bricks4: this.cells / 64,
      occupiedBricks4: u[13],
      bricks8: this.cells / 512,
      occupiedBricks8: u[14],
      maxMassQuanta: u[11],
      maxMomQuanta: u[12],
      i32HeadroomMass: u[11] / 2147483647,
      i32HeadroomMom: u[12] / 2147483647,
    };
  }

  async readParticles(): Promise<Float32Array> {
    return new Float32Array(await this.read(this.particleBuf, this.n * FLOATS_PER_PARTICLE * 4));
  }

  async flush(): Promise<void> {
    await this.device.queue.onSubmittedWorkDone();
  }

  // ---- render --------------------------------------------------------------

  initRender(format: GPUTextureFormat): void {
    const d = this.device;
    const module = d.createShaderModule({ label: "render", code: renderWgsl });
    const V = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    const bgl = d.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: V, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: V, buffer: { type: "uniform" } },
        { binding: 3, visibility: V, buffer: { type: "uniform" } },
      ],
    });
    const layout = d.createPipelineLayout({ bindGroupLayouts: [bgl] });
    const mk = (vs: string, fs: string, cull: GPUCullMode = "none") =>
      d.createRenderPipeline({
        layout,
        vertex: { module, entryPoint: vs },
        fragment: { module, entryPoint: fs, targets: [{ format }] },
        primitive: { topology: "triangle-list", cullMode: cull },
        depthStencil: { format: "depth32float", depthWriteEnabled: true, depthCompare: "less" },
      });
    this.renderPipes = {
      particle: mk("vs_particle", "fs_particle"),
      floor: mk("vs_floor", "fs_floor"),
      collider: mk("vs_collider", "fs_collider"),
    };
    this.camBuf = d.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.colorBuf = d.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.colBuf = d.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.renderBg = d.createBindGroup({
      layout: bgl,
      entries: [
        { binding: 0, resource: { buffer: this.camBuf } },
        { binding: 1, resource: { buffer: this.particleBuf } },
        { binding: 2, resource: { buffer: this.colorBuf } },
        { binding: 3, resource: { buffer: this.colBuf } },
      ],
    });
  }

  render(
    ctx: GPUCanvasContext,
    cam: { target: [number, number, number]; yaw: number; pitch: number; dist: number },
    opts: { time: number; dt: number; mode: number; radius: number; colliders: ColliderState[] },
  ): void {
    if (!this.renderPipes || !this.camBuf || !this.renderBg || !this.colorBuf || !this.colBuf) throw new Error("initRender first");
    const tex = ctx.getCurrentTexture();
    const w = tex.width;
    const h = tex.height;
    if (!this.depth || this.depth.width !== w || this.depth.height !== h) {
      this.depth?.destroy();
      this.depth = this.device.createTexture({ size: [w, h], format: "depth32float", usage: GPUTextureUsage.RENDER_ATTACHMENT });
    }
    const cy = Math.cos(cam.yaw);
    const sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch);
    const sp = Math.sin(cam.pitch);
    const eye: [number, number, number] = [
      cam.target[0] + cam.dist * cp * sy,
      cam.target[1] + cam.dist * sp,
      cam.target[2] + cam.dist * cp * cy,
    ];
    const vp = viewProj(eye, cam.target, 0.7, w / h, 1, 2000);
    const fwd = norm(sub(cam.target, eye));
    const right = norm(cross(fwd, [0, 1, 0]));
    const up = cross(right, fwd);
    const u = new Float32Array(36);
    const uu = new Uint32Array(u.buffer);
    u.set(vp, 0);
    u.set(right, 16);
    u[19] = opts.radius;
    u.set(up, 20);
    u[23] = opts.time;
    u.set(eye, 24);
    uu[27] = opts.mode;
    u.set(norm([0.5, 1.0, 0.35]), 28);
    u[31] = this.guard;
    u.set([this.grid[0], this.grid[1], this.grid[2]], 32);
    u[35] = opts.dt;
    this.device.queue.writeBuffer(this.camBuf, 0, u);
    const col = new Float32Array(32);
    for (let i = 0; i < 8; i += 1) {
      const m = this.mats[Math.min(i, this.mats.length - 1)];
      if (m) col.set([...m.color, 1], i * 4);
    }
    this.device.queue.writeBuffer(this.colorBuf, 0, col);
    const cb = new ArrayBuffer(128);
    const cv = new DataView(cb);
    for (let c = 0; c < Math.min(2, opts.colliders.length); c += 1) {
      const s = opts.colliders[c];
      const o = c * 64;
      cv.setUint32(o, s.kind, true);
      cv.setFloat32(o + 8, s.radius, true);
      for (let a = 0; a < 3; a += 1) {
        cv.setFloat32(o + 16 + a * 4, s.center[a], true);
        cv.setFloat32(o + 32 + a * 4, s.half[a], true);
      }
    }
    this.device.queue.writeBuffer(this.colBuf, 0, cb);
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [{ view: tex.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0.09, g: 0.085, b: 0.08, a: 1 } }],
      depthStencilAttachment: { view: this.depth.createView(), depthLoadOp: "clear", depthStoreOp: "store", depthClearValue: 1 },
    });
    pass.setBindGroup(0, this.renderBg);
    pass.setPipeline(this.renderPipes.floor);
    pass.draw(6);
    pass.setPipeline(this.renderPipes.particle);
    pass.draw(6, this.n);
    pass.setPipeline(this.renderPipes.collider);
    pass.draw(36, 2);
    pass.end();
    this.device.queue.submit([enc.finish()]);
  }
}

// ---- small math ----------------------------------------------------------------
type V3 = [number, number, number];
function sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a: V3): V3 {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
}
function viewProj(eye: V3, target: V3, fovY: number, aspect: number, near: number, far: number): Float32Array {
  const f = norm(sub(target, eye));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  // view (column-major)
  const v = [
    r[0], u[0], -f[0], 0,
    r[1], u[1], -f[1], 0,
    r[2], u[2], -f[2], 0,
    -(r[0] * eye[0] + r[1] * eye[1] + r[2] * eye[2]),
    -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]),
    f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2],
    1,
  ];
  const t = 1 / Math.tan(fovY / 2);
  // WebGPU clip z in [0, 1]
  const p = [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, far / (near - far), -1, 0, 0, (near * far) / (near - far), 0];
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let rr = 0; rr < 4; rr += 1) {
      let s = 0;
      for (let k = 0; k < 4; k += 1) s += p[k * 4 + rr] * v[c * 4 + k];
      out[c * 4 + rr] = s;
    }
  }
  return out;
}
