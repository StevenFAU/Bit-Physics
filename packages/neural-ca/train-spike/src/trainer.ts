// NCA trainer on WebGPU — the measurement core of the Grow training spike.
//
// One iteration = draw a batch (pool or seeds) -> T forward steps with every
// step's state kept (checkpoints) -> loss -> T backward steps (recompute the
// hidden layer per step, backprop the MLP, transpose the perception, reduce
// the weight gradients) -> per-tensor normalisation + Adam. Everything stays
// on the GPU; only the loss and timestamps come back, through a small ring.

import { wgsl, type GpuContext } from "@bp/gpu";
import { hash3, unit, HashStream } from "@bp/runtime";
import {
  ADAM,
  BWD_GATHER,
  BWD_GEMM,
  BWD_MLP,
  FWD_MASK,
  FWD_MLP,
  GEMM_CHUNK,
  GRAD_REDUCE,
  LOSS,
  LOSS_REDUCE,
  NPARAM,
  SCRATCH_VEC4,
  SEED_FILL,
} from "./kernels.js";

export interface TrainerShape {
  G: number;
  B: number;
  /** Longest rollout this allocation supports (state checkpoints = Tmax + 1). */
  Tmax: number;
  poolSize: number;
  /** Longest forward-only evaluation rollout. */
  evalTmax: number;
}

export interface IterationResult {
  iter: number;
  T: number;
  loss: number;
  sampleLoss: number[];
  /** GPU ms per phase from timestamps (null without timestamp-query). */
  gpu: Record<string, number> | null;
}

type Slot = "u" | "ud" | "r" | "rw";
const PASSES = ["prep", "fwd", "loss", "bwd", "opt"] as const;
const STEP_STRIDE = 256;
const RING = 3;
const U = (): typeof GPUBufferUsage => GPUBufferUsage;

export class NcaTrainer {
  readonly device: GPUDevice;
  readonly N: number;
  readonly stateBytes: number;
  readonly gemmSlots: number;
  /** Bytes per buffer role, for the memory report. */
  readonly memory: Record<string, number> = {};
  private readonly buffers: GPUBuffer[] = [];

  private readonly iterBuf: GPUBuffer;
  private readonly stepBuf: GPUBuffer;
  private readonly wUniform: GPUBuffer;
  readonly theta: GPUBuffer;
  private readonly mom: GPUBuffer;
  private readonly vel: GPUBuffer;
  readonly grad: GPUBuffer;
  readonly states: GPUBuffer[] = [];
  private readonly xmid: GPUBuffer;
  readonly alive: GPUBuffer;
  private readonly target: GPUBuffer;
  private readonly gbuf: GPUBuffer[];
  private readonly lossPart: GPUBuffer;
  readonly lossOut: GPUBuffer;
  private readonly idxBuf: GPUBuffer;
  private readonly poolLoss: GPUBuffer;
  private readonly scratch: GPUBuffer;
  private readonly gp: GPUBuffer;
  private readonly partial: GPUBuffer;
  private readonly reduceParams: GPUBuffer;
  private readonly adamParams: GPUBuffer;
  private readonly pool: GPUBuffer[] = [];
  private readonly poolPerChunk: number;

  private readonly querySet: GPUQuerySet | null;
  private readonly resolveBuf: GPUBuffer | null;
  private readonly ring: { buf: GPUBuffer; pending: Promise<IterationResult | null> | null }[] = [];

  private readonly k: Record<string, { pipe: GPUComputePipeline; bgl: GPUBindGroupLayout }> = {};
  private bg: {
    fwdMlp: GPUBindGroup[];
    fwdMask: GPUBindGroup[];
    fwdMaskEvalBack: GPUBindGroup;
    loss: GPUBindGroup[];
    lossReduce: GPUBindGroup;
    bwdMlp: GPUBindGroup[];
    gather: GPUBindGroup[];
    gemm: GPUBindGroup;
    gradReduce: GPUBindGroup;
    adam: GPUBindGroup;
    seedFill: GPUBindGroup;
  };

  constructor(
    readonly ctx: GpuContext,
    readonly shape: TrainerShape,
  ) {
    const { G, B, Tmax, poolSize, evalTmax } = shape;
    if (G % 8 !== 0) throw new Error("G must be a multiple of 8");
    this.device = ctx.device;
    this.N = B * G * G;
    this.stateBytes = this.N * 64;
    this.gemmSlots = Math.ceil(this.N / GEMM_CHUNK);

    const S = U().STORAGE | U().COPY_SRC | U().COPY_DST;
    this.iterBuf = this.buf("uniform", 32, U().UNIFORM | U().COPY_DST);
    this.stepBuf = this.buf("uniform", (Tmax + 1 + evalTmax) * STEP_STRIDE, U().UNIFORM | U().COPY_DST);
    this.wUniform = this.buf("params", NPARAM * 4, U().UNIFORM | U().COPY_DST);
    this.theta = this.buf("params", NPARAM * 4, S);
    this.mom = this.buf("optimizer", NPARAM * 4, S);
    this.vel = this.buf("optimizer", NPARAM * 4, S);
    this.grad = this.buf("optimizer", NPARAM * 4, S);
    for (let t = 0; t <= Tmax; t += 1) this.states.push(this.buf("state checkpoints", this.stateBytes, S));
    this.xmid = this.buf("forward temp", this.stateBytes, S);
    this.alive = this.buf("alive masks", Tmax * this.N * 4, S);
    this.target = this.buf("target", G * G * 16, S);
    this.gbuf = [this.buf("state gradient", this.stateBytes, S), this.buf("state gradient", this.stateBytes, S)];
    this.lossPart = this.buf("loss", B * (G / 8) * (G / 8) * 4, S);
    this.lossOut = this.buf("loss", (B + 1) * 4, S);
    this.idxBuf = this.buf("pool", Math.max(B, 4) * 4, S);
    this.poolLoss = this.buf("pool", Math.max(poolSize, 1) * 4, S);
    this.scratch = this.buf("backward scratch", this.N * SCRATCH_VEC4 * 16, S);
    this.gp = this.buf("backward scratch", this.N * 12 * 16, S);
    this.partial = this.buf("weight-gradient partials", this.gemmSlots * NPARAM * 4, S);
    this.reduceParams = this.buf("uniform", 16, U().UNIFORM | U().COPY_DST);
    this.adamParams = this.buf("uniform", 32, U().UNIFORM | U().COPY_DST);
    // The pool is only ever copied (never bound), so it can live in chunks
    // under maxBufferSize whatever its total size.
    const sampleBytes = G * G * 64;
    this.poolPerChunk = Math.max(1, Math.floor(Math.min(ctx.device.limits.maxBufferSize, 128 * 2 ** 20) / sampleBytes));
    for (let i = 0; i < poolSize; i += this.poolPerChunk) {
      const n = Math.min(this.poolPerChunk, poolSize - i);
      this.pool.push(this.buf("pool", n * sampleBytes, U().COPY_SRC | U().COPY_DST));
    }

    // Step uniforms: training entry t (aliveSlot t), eval entry Tmax+1+t (slot 0).
    const steps = new Uint32Array(((Tmax + 1 + evalTmax) * STEP_STRIDE) / 4);
    for (let t = 0; t <= Tmax; t += 1) {
      steps[(t * STEP_STRIDE) / 4] = t;
      steps[(t * STEP_STRIDE) / 4 + 1] = Math.min(t, Tmax - 1);
    }
    for (let t = 0; t < evalTmax; t += 1) {
      const o = ((Tmax + 1 + t) * STEP_STRIDE) / 4;
      steps[o] = t;
      steps[o + 1] = 0;
    }
    this.device.queue.writeBuffer(this.stepBuf, 0, steps);
    this.device.queue.writeBuffer(this.reduceParams, 0, new Uint32Array([this.gemmSlots, 0, 0, 0]));

    this.querySet = ctx.timestamps
      ? this.device.createQuerySet({ type: "timestamp", count: PASSES.length * 2, label: "spike-ts" })
      : null;
    this.resolveBuf = this.querySet
      ? this.buf("readback", PASSES.length * 16, U().QUERY_RESOLVE | U().COPY_SRC)
      : null;
    for (let i = 0; i < RING; i += 1) {
      this.ring.push({ buf: this.buf("readback", 256 + PASSES.length * 16, U().MAP_READ | U().COPY_DST), pending: null });
    }

    this.kernel("fwdMlp", FWD_MLP, ["u", "ud", "u", "r", "rw"]);
    this.kernel("fwdMask", FWD_MASK, ["u", "ud", "r", "r", "rw", "rw"]);
    this.kernel("loss", LOSS, ["u", "ud", "r", "r", "rw", "rw"]);
    this.kernel("lossReduce", LOSS_REDUCE, ["u", "ud", "r", "rw", "r", "rw"]);
    this.kernel("bwdMlp", BWD_MLP, ["u", "ud", "u", "r", "r", "r", "rw", "rw"]);
    this.kernel("gather", BWD_GATHER, ["u", "ud", "r", "r", "r", "rw"]);
    this.kernel("gemm", BWD_GEMM, ["u", "ud", "r", "r", "rw"]);
    this.kernel("gradReduce", GRAD_REDUCE, ["u", "r", "rw"]);
    this.kernel("adam", ADAM, ["u", "r", "rw", "rw", "rw"]);
    this.kernel("seedFill", SEED_FILL, ["u", "ud", "r", "r", "rw"]);

    const st = { buffer: this.stepBuf, offset: 0, size: 16 };
    const it = this.iterBuf;
    const g = (t: number): GPUBuffer => this.gbuf[t % 2]!;
    const fwdMlp: GPUBindGroup[] = [];
    const fwdMask: GPUBindGroup[] = [];
    const loss: GPUBindGroup[] = [];
    const bwdMlp: GPUBindGroup[] = [];
    const gather: GPUBindGroup[] = [];
    for (let t = 0; t < Tmax; t += 1) {
      fwdMlp.push(this.group("fwdMlp", [it, st, this.wUniform, this.states[t]!, this.xmid]));
      fwdMask.push(this.group("fwdMask", [it, st, this.states[t]!, this.xmid, this.states[t + 1]!, this.alive]));
      bwdMlp.push(
        this.group("bwdMlp", [it, st, this.wUniform, this.states[t]!, g(t + 1), this.alive, this.scratch, this.gp]),
      );
      gather.push(this.group("gather", [it, st, g(t + 1), this.alive, this.gp, g(t)]));
    }
    for (let T = 0; T <= Tmax; T += 1) {
      loss.push(this.group("loss", [it, st, this.states[T]!, this.target, g(T), this.lossPart]));
    }
    this.bg = {
      fwdMlp,
      fwdMask,
      fwdMaskEvalBack: this.group("fwdMask", [it, st, this.states[1]!, this.xmid, this.states[0]!, this.alive]),
      loss,
      lossReduce: this.group("lossReduce", [it, st, this.lossPart, this.lossOut, this.idxBuf, this.poolLoss]),
      bwdMlp,
      gather,
      gemm: this.group("gemm", [it, st, this.alive, this.scratch, this.partial]),
      gradReduce: this.group("gradReduce", [this.reduceParams, this.partial, this.grad]),
      adam: this.group("adam", [this.adamParams, this.grad, this.theta, this.mom, this.vel]),
      seedFill: this.group("seedFill", [it, st, this.idxBuf, this.poolLoss, this.states[0]!]),
    };
  }

  // ------------------------------------------------------------ plumbing

  private buf(role: string, size: number, usage: number): GPUBuffer {
    const b = this.device.createBuffer({ size: Math.ceil(size / 16) * 16, usage, label: role });
    this.memory[role] = (this.memory[role] ?? 0) + b.size;
    this.buffers.push(b);
    return b;
  }

  get totalBytes(): number {
    return Object.values(this.memory).reduce((a, b) => a + b, 0);
  }

  private kernel(name: string, code: string, slots: Slot[]): void {
    const entries: GPUBindGroupLayoutEntry[] = slots.map((s, binding) => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      buffer:
        s === "u"
          ? { type: "uniform" }
          : s === "ud"
            ? { type: "uniform", hasDynamicOffset: true }
            : s === "r"
              ? { type: "read-only-storage" }
              : { type: "storage" },
    }));
    const bgl = this.device.createBindGroupLayout({ entries, label: name });
    const module = this.device.createShaderModule({ code: wgsl(code), label: name });
    const pipe = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
      compute: { module, entryPoint: "main" },
      label: name,
    });
    this.k[name] = { pipe, bgl };
  }

  private group(name: string, res: (GPUBuffer | GPUBufferBinding)[]): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.k[name]!.bgl,
      entries: res.map((r, binding) => ({ binding, resource: r instanceof GPUBuffer ? { buffer: r } : r })),
      label: name,
    });
  }

  private dispatch(pass: GPUComputePassEncoder, name: string, bg: GPUBindGroup, stepEntry: number | null, wg: [number, number, number]): void {
    pass.setPipeline(this.k[name]!.pipe);
    if (stepEntry === null) pass.setBindGroup(0, bg);
    else pass.setBindGroup(0, bg, [stepEntry * STEP_STRIDE]);
    pass.dispatchWorkgroups(wg[0], wg[1], wg[2]);
  }

  private cellsWg(): [number, number, number] {
    return [this.shape.G / 8, this.shape.G / 8, this.shape.B];
  }

  private beginPass(enc: GPUCommandEncoder, i: number | null): GPUComputePassEncoder {
    if (i === null || !this.querySet) return enc.beginComputePass();
    return enc.beginComputePass({
      timestampWrites: { querySet: this.querySet, beginningOfPassWriteIndex: i * 2, endOfPassWriteIndex: i * 2 + 1 },
    });
  }

  writeIter(seed: number, mode: number): void {
    const { G, B, poolSize } = this.shape;
    const a = new ArrayBuffer(32);
    const u = new Uint32Array(a);
    const f = new Float32Array(a);
    u[0] = G;
    u[1] = B;
    u[2] = seed >>> 0;
    u[3] = this.N;
    f[4] = 2 / (B * 4 * G * G);
    u[5] = 1 << 23; // fire rate 0.5
    u[6] = mode;
    u[7] = poolSize;
    this.device.queue.writeBuffer(this.iterBuf, 0, a);
  }

  // ----------------------------------------------------------- data in

  setParams(v: Float32Array): void {
    if (v.length !== NPARAM) throw new Error("bad param length");
    this.device.queue.writeBuffer(this.theta, 0, v);
    this.device.queue.writeBuffer(this.wUniform, 0, v);
    const z = new Float32Array(NPARAM);
    this.device.queue.writeBuffer(this.mom, 0, z);
    this.device.queue.writeBuffer(this.vel, 0, z);
  }

  /** PyTorch Conv2d default init for w1/b1, zero w2 (the paper's zero-init last layer). */
  initParams(seed: number): Float32Array {
    const v = new Float32Array(NPARAM);
    const hs = new HashStream(seed, 77);
    const bound = 1 / Math.sqrt(48);
    for (let k = 0; k < 6144 + 128; k += 1) v[k] = hs.range(-bound, bound);
    this.setParams(v);
    return v;
  }

  setTarget(rgba: Float32Array): void {
    this.device.queue.writeBuffer(this.target, 0, rgba);
  }

  writeStates0(cells: Float32Array): void {
    this.device.queue.writeBuffer(this.states[0]!, 0, cells);
  }

  resetPool(): void {
    const { G } = this.shape;
    const enc = this.device.createCommandEncoder();
    for (const b of this.pool) enc.clearBuffer(b);
    enc.clearBuffer(this.poolLoss);
    this.device.queue.submit([enc.finish()]);
    const mid = G / 2;
    const cell = new Float32Array(16);
    for (let c = 3; c < 16; c += 1) cell[c] = 1;
    for (let i = 0; i < this.shape.poolSize; i += 1) {
      const [buf, off] = this.poolAt(i);
      this.device.queue.writeBuffer(buf, off + (mid * G + mid) * 64, cell);
    }
  }

  private poolAt(i: number): [GPUBuffer, number] {
    const c = Math.floor(i / this.poolPerChunk);
    return [this.pool[c]!, (i - c * this.poolPerChunk) * this.shape.G * this.shape.G * 64];
  }

  // --------------------------------------------------------- iteration

  /** Encode forward (T steps), loss, backward and (optionally) Adam. */
  encode(enc: GPUCommandEncoder, T: number, opts: { pool: number[] | null; adam: boolean; timed: boolean }): void {
    const { B } = this.shape;
    const sampleBytes = this.stateBytes / B;
    const cells = this.cellsWg();
    if (opts.pool) {
      for (let b = 0; b < B; b += 1) {
        const [buf, off] = this.poolAt(opts.pool[b]!);
        enc.copyBufferToBuffer(buf, off, this.states[0]!, b * sampleBytes, sampleBytes);
      }
    }
    let p = this.beginPass(enc, opts.timed ? 0 : null);
    if (opts.pool) this.dispatch(p, "seedFill", this.bg.seedFill, 0, cells);
    p.end();
    p = this.beginPass(enc, opts.timed ? 1 : null);
    for (let t = 0; t < T; t += 1) {
      this.dispatch(p, "fwdMlp", this.bg.fwdMlp[t]!, t, cells);
      this.dispatch(p, "fwdMask", this.bg.fwdMask[t]!, t, cells);
    }
    p.end();
    p = this.beginPass(enc, opts.timed ? 2 : null);
    this.dispatch(p, "loss", this.bg.loss[T]!, 0, cells);
    this.dispatch(p, "lossReduce", this.bg.lossReduce, 0, [1, 1, 1]);
    p.end();
    enc.clearBuffer(this.partial);
    p = this.beginPass(enc, opts.timed ? 3 : null);
    for (let t = T - 1; t >= 0; t -= 1) {
      this.dispatch(p, "bwdMlp", this.bg.bwdMlp[t]!, t, cells);
      this.dispatch(p, "gemm", this.bg.gemm, t, [this.gemmSlots, 1, 1]);
      if (t > 0) this.dispatch(p, "gather", this.bg.gather[t]!, t, cells);
    }
    p.end();
    p = this.beginPass(enc, opts.timed ? 4 : null);
    this.dispatch(p, "gradReduce", this.bg.gradReduce, null, [Math.ceil(2080 / 64), 1, 1]);
    if (opts.adam) this.dispatch(p, "adam", this.bg.adam, null, [1, 1, 1]);
    p.end();
    if (opts.adam) enc.copyBufferToBuffer(this.theta, 0, this.wUniform, 0, NPARAM * 4);
    if (opts.pool) {
      for (let b = 0; b < B; b += 1) {
        const [buf, off] = this.poolAt(opts.pool[b]!);
        enc.copyBufferToBuffer(this.states[T]!, b * sampleBytes, buf, off, sampleBytes);
      }
    }
  }

  writeAdam(lr: number, step: number): void {
    const b1 = 0.9;
    const b2 = 0.999;
    const a = new ArrayBuffer(32);
    const f = new Float32Array(a);
    const u = new Uint32Array(a);
    f[0] = lr;
    f[1] = b1;
    f[2] = b2;
    f[3] = 1e-8;
    f[4] = 1 - b1 ** step;
    f[5] = 1 - b2 ** step;
    u[6] = 1;
    this.device.queue.writeBuffer(this.adamParams, 0, a);
  }

  /**
   * Submit one training iteration; returns a promise of its loss/timings that
   * resolves once the GPU is done. At most RING iterations are in flight.
   */
  async submitIteration(
    iter: number,
    T: number,
    seed: number,
    pool: number[] | null,
    lr: number,
    dense = false,
  ): Promise<{ result: Promise<IterationResult | null> }> {
    const slot = this.ring[iter % RING]!;
    if (slot.pending) await slot.pending;
    if (pool) this.device.queue.writeBuffer(this.idxBuf, 0, new Uint32Array(pool));
    this.writeIter(seed, (pool ? 1 : 0) | (dense ? 2 : 0));
    this.writeAdam(lr, iter + 1);
    const enc = this.device.createCommandEncoder();
    this.encode(enc, T, { pool, adam: true, timed: this.querySet !== null });
    enc.copyBufferToBuffer(this.lossOut, 0, slot.buf, 0, (this.shape.B + 1) * 4);
    if (this.querySet && this.resolveBuf) {
      enc.resolveQuerySet(this.querySet, 0, PASSES.length * 2, this.resolveBuf, 0);
      enc.copyBufferToBuffer(this.resolveBuf, 0, slot.buf, 256, PASSES.length * 16);
    }
    this.device.queue.submit([enc.finish()]);
    const B = this.shape.B;
    const timed = this.querySet !== null;
    slot.pending = slot.buf.mapAsync(GPUMapMode.READ).then(() => {
      const r = slot.buf.getMappedRange();
      const l = new Float32Array(r.slice(0, (B + 1) * 4));
      let gpu: Record<string, number> | null = null;
      if (timed) {
        const ts = new BigUint64Array(r.slice(256, 256 + PASSES.length * 16));
        gpu = {};
        let tot = 0;
        PASSES.forEach((name, i) => {
          const b = ts[i * 2]!;
          const e = ts[i * 2 + 1]!;
          const ms = e > b ? Number(e - b) / 1e6 : 0;
          gpu![name] = ms;
          tot += ms;
        });
        gpu.total = tot;
      }
      slot.buf.unmap();
      slot.pending = null;
      return { iter, T, loss: l[B]!, sampleLoss: Array.from(l.slice(0, B)), gpu };
    });
    return { result: slot.pending };
  }

  async drain(): Promise<void> {
    for (const s of this.ring) if (s.pending) await s.pending;
    await this.device.queue.onSubmittedWorkDone();
  }

  // -------------------------------------------------------------- reads

  async read(src: GPUBuffer, size: number, offset = 0): Promise<ArrayBuffer> {
    const staging = this.device.createBuffer({ size: Math.ceil(size / 4) * 4, usage: U().COPY_DST | U().MAP_READ });
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(src, offset, staging, 0, Math.ceil(size / 4) * 4);
    this.device.queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const out = staging.getMappedRange().slice(0, size);
    staging.destroy();
    return out;
  }

  /** Forward-only rollout of every sample from the seed (eval); returns the final cells. */
  async evalFromSeed(steps: number, seed: number): Promise<Float32Array> {
    if (steps > this.shape.evalTmax) throw new Error("eval rollout longer than evalTmax");
    await this.drain();
    this.writeIter(seed, 0);
    const enc = this.device.createCommandEncoder();
    const cells = this.cellsWg();
    const p = enc.beginComputePass();
    this.dispatch(p, "seedFill", this.bg.seedFill, 0, cells);
    for (let t = 0; t < steps; t += 1) {
      const e = this.shape.Tmax + 1 + t;
      const cur = t % 2;
      this.dispatch(p, "fwdMlp", this.bg.fwdMlp[cur]!, e, cells);
      this.dispatch(p, "fwdMask", cur === 0 ? this.bg.fwdMask[0]! : this.bg.fwdMaskEvalBack, e, cells);
    }
    p.end();
    this.device.queue.submit([enc.finish()]);
    return new Float32Array(await this.read(this.states[steps % 2]!, this.stateBytes));
  }

  /** Gradient of one rollout from given cells (no optimiser step). */
  async gradOnce(x0: Float32Array, T: number, seed: number): Promise<{ loss: number; grad: Float32Array; xT: Float32Array; alive: Uint32Array }> {
    await this.drain();
    this.writeStates0(x0);
    this.writeIter(seed, 0);
    const enc = this.device.createCommandEncoder();
    this.encode(enc, T, { pool: null, adam: false, timed: false });
    this.device.queue.submit([enc.finish()]);
    const [g, l, xT, al] = await Promise.all([
      this.read(this.grad, NPARAM * 4),
      this.read(this.lossOut, (this.shape.B + 1) * 4),
      this.read(this.states[T]!, this.stateBytes),
      this.read(this.alive, T * this.N * 4),
    ]);
    return {
      grad: new Float32Array(g),
      loss: new Float32Array(l)[this.shape.B]!,
      xT: new Float32Array(xT),
      alive: new Uint32Array(al),
    };
  }

  /** GPU ms of each kernel family run alone over T steps (on current data). */
  async profileKernels(T: number, seed: number, reps = 5): Promise<Record<string, number>> {
    if (!this.querySet || !this.resolveBuf) return {};
    const fams = ["fwdMlp", "fwdMask", "bwdMlp", "gemm", "gather"] as const;
    const qs = this.device.createQuerySet({ type: "timestamp", count: fams.length * 2 });
    const rb = this.device.createBuffer({ size: fams.length * 16, usage: U().QUERY_RESOLVE | U().COPY_SRC });
    const sum: Record<string, number> = {};
    for (let r = 0; r < reps; r += 1) {
      await this.drain();
      this.writeIter(seed, 0);
      const enc = this.device.createCommandEncoder();
      const cells = this.cellsWg();
      fams.forEach((f, i) => {
        const p = enc.beginComputePass({ timestampWrites: { querySet: qs, beginningOfPassWriteIndex: 2 * i, endOfPassWriteIndex: 2 * i + 1 } });
        for (let t = T - 1; t >= 0; t -= 1) {
          if (f === "fwdMlp") this.dispatch(p, f, this.bg.fwdMlp[t]!, t, cells);
          if (f === "fwdMask") this.dispatch(p, f, this.bg.fwdMask[t]!, t, cells);
          if (f === "bwdMlp") this.dispatch(p, f, this.bg.bwdMlp[t]!, t, cells);
          if (f === "gemm") this.dispatch(p, f, this.bg.gemm, t, [this.gemmSlots, 1, 1]);
          if (f === "gather" && t > 0) this.dispatch(p, f, this.bg.gather[t]!, t, cells);
        }
        p.end();
      });
      enc.resolveQuerySet(qs, 0, fams.length * 2, rb, 0);
      this.device.queue.submit([enc.finish()]);
      const ts = new BigUint64Array(await this.read(rb, fams.length * 16));
      fams.forEach((f, i) => {
        sum[f] = (sum[f] ?? 0) + Number(ts[2 * i + 1]! - ts[2 * i]!) / 1e6 / reps;
      });
    }
    qs.destroy();
    rb.destroy();
    return sum;
  }

  destroy(): void {
    for (const b of this.buffers) b.destroy();
    this.querySet?.destroy();
  }
}

/** Rollout length, iteration seed and pool draw for iteration i of a run. */
export function schedule(runSeed: number, i: number, Tmin: number, Tmax: number, B: number, poolSize: number): { T: number; seed: number; pool: number[] | null } {
  const T = Tmin + Math.min(Tmax - Tmin, Math.floor(unit(hash3(runSeed, 2, i)) * (Tmax - Tmin + 1)));
  const seed = hash3(runSeed, 3, i);
  if (poolSize <= 0) return { T, seed, pool: null };
  const picked: number[] = [];
  let c = 0;
  while (picked.length < B) {
    const k = Math.floor(unit(hash3(runSeed ^ 0x9e3779b9, i, c)) * poolSize);
    c += 1;
    if (!picked.includes(k)) picked.push(k);
  }
  return { T, seed, pool: picked };
}
