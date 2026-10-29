// The NCA trainer on WebGPU (rebuild-v2 04-neural-ca.md, M2 Teach).
//
// Ported from the M0 training spike (packages/neural-ca/train-spike/src/
// trainer.ts) and restructured for a page that must keep rendering:
//   * one training iteration is a sequence of small units — a start, T
//     forward steps, the loss, T backward steps, the optimiser step — that a
//     sliced job (teach/job.ts) records a few at a time into the frame's own
//     command encoder; the GPU buffers carry the iteration across frames;
//   * per-iteration uniforms (Iter, Adam, the pool draw) are written into a
//     small upload ring and copied into place by the encoder at the start of
//     the iteration, so the tail of one iteration and the head of the next can
//     share a frame without one overwriting the other's parameters;
//   * the per-step state checkpoints are packed into a few large buffers
//     (bound by range) instead of one buffer per step: the spike measured VRAM
//     at 1.24–1.42× the accounted bytes with 97 small buffers;
//   * pipelines compile asynchronously, once per device (TrainKernels), after
//     the page has signalled ready.
// Everything stays on the GPU; only losses, evaluation frames and (when asked)
// the weights come back.

import { wgsl } from "@bp/gpu";
import { HashStream, hash3, unit } from "@bp/runtime";
import {
  ADAM,
  BWD_GATHER,
  BWD_GEMM,
  BWD_MLP,
  DAMAGE,
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

export { NPARAM };

export interface TrainerShape {
  /** Grid side (a multiple of 8). */
  G: number;
  /** Samples per batch. */
  B: number;
  /** Longest rollout this allocation supports (state checkpoints = Tmax + 1). */
  Tmax: number;
  /** Pool samples (0: every rollout starts from the seed). */
  poolSize: number;
  /** Longest forward-only evaluation rollout (0: no evaluation). */
  evalTmax: number;
}

type Slot = "u" | "ud" | "r" | "rw";
const STEP_STRIDE = 256;
/** Upload-ring slots: per-iteration uniforms staged for an in-encoder copy. */
const UPLOAD_SLOTS = 8;
const UPLOAD_STRIDE = 256;
const IDX_OFF = 64;
const KERNELS = ["fwdMlp", "fwdMask", "loss", "lossReduce", "bwdMlp", "gather", "gemm", "gradReduce", "adam", "seedFill", "damage"] as const;
type KernelName = (typeof KERNELS)[number];
const SLOTS: Record<KernelName, Slot[]> = {
  fwdMlp: ["u", "ud", "u", "r", "rw"],
  fwdMask: ["u", "ud", "r", "r", "rw", "rw"],
  loss: ["u", "ud", "r", "r", "rw", "rw"],
  lossReduce: ["u", "ud", "r", "rw", "r", "rw"],
  bwdMlp: ["u", "ud", "u", "r", "r", "r", "rw", "rw"],
  gather: ["u", "ud", "r", "r", "r", "rw"],
  gemm: ["u", "ud", "r", "r", "rw"],
  gradReduce: ["u", "r", "rw"],
  adam: ["u", "r", "rw", "rw", "rw"],
  seedFill: ["u", "ud", "r", "r", "rw"],
  damage: ["u", "ud", "r", "r", "rw"],
};
const SOURCES: Record<KernelName, string> = {
  fwdMlp: FWD_MLP,
  fwdMask: FWD_MASK,
  loss: LOSS,
  lossReduce: LOSS_REDUCE,
  bwdMlp: BWD_MLP,
  gather: BWD_GATHER,
  gemm: BWD_GEMM,
  gradReduce: GRAD_REDUCE,
  adam: ADAM,
  seedFill: SEED_FILL,
  damage: DAMAGE,
};

/** The training pipelines, compiled once per device (asynchronously). */
export class TrainKernels {
  private constructor(readonly k: Record<KernelName, { pipe: GPUComputePipeline; bgl: GPUBindGroupLayout }>) {}

  static async create(device: GPUDevice): Promise<TrainKernels> {
    const entries = await Promise.all(
      KERNELS.map(async (name) => {
        const bgl = device.createBindGroupLayout({
          label: `teach-${name}`,
          entries: SLOTS[name].map((s, binding) => ({
            binding,
            visibility: GPUShaderStage.COMPUTE,
            buffer:
              s === "u"
                ? { type: "uniform" as const }
                : s === "ud"
                  ? { type: "uniform" as const, hasDynamicOffset: true }
                  : s === "r"
                    ? { type: "read-only-storage" as const }
                    : { type: "storage" as const },
          })),
        });
        const module = device.createShaderModule({ code: wgsl(SOURCES[name]), label: `teach-${name}` });
        const pipe = await device.createComputePipelineAsync({
          layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
          compute: { module, entryPoint: "main" },
          label: `teach-${name}`,
        });
        return [name, { pipe, bgl }] as const;
      }),
    );
    return new TrainKernels(Object.fromEntries(entries) as Record<KernelName, { pipe: GPUComputePipeline; bgl: GPUBindGroupLayout }>);
  }
}

/** One training iteration's inputs. */
export interface IterPlan {
  /** Rollout length. */
  T: number;
  /** Fire-mask seed (bp_hash3(seed, t, cell)). */
  seed: number;
  /** Pool indices drawn for the batch, or null (start from the seeds, or from given cells). */
  pool: number[] | null;
  /** Start every sample from the seed cell (ignored with a pool draw). */
  seedAll: boolean;
  /** Apply Adam (false: gradients only — the gradient check). */
  adam: boolean;
  lr: number;
  /** Adam's step count (1-based), for the bias corrections. */
  adamStep: number;
  /** Damage this many of the batch's best samples before the rollout (pool draws only). */
  damage: number;
}

/** Binding of one state checkpoint: a range of a packed buffer. */
interface StateRef {
  buffer: GPUBuffer;
  offset: number;
}

export class NcaTrainer {
  readonly device: GPUDevice;
  readonly N: number;
  readonly stateBytes: number;
  readonly sampleBytes: number;
  readonly gemmSlots: number;
  /** Bytes per buffer role (the memory readout). */
  readonly memory: Record<string, number> = {};
  private readonly buffers: GPUBuffer[] = [];

  private readonly iterBuf: GPUBuffer;
  private readonly stepBuf: GPUBuffer;
  private readonly upload: GPUBuffer;
  private uploadSlot = 0;
  private readonly wUniform: GPUBuffer;
  readonly theta: GPUBuffer;
  private readonly mom: GPUBuffer;
  private readonly vel: GPUBuffer;
  readonly grad: GPUBuffer;
  private readonly states: StateRef[] = [];
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
  private readonly bg: {
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
    damage: GPUBindGroup;
  };

  constructor(
    device: GPUDevice,
    private readonly kernels: TrainKernels,
    readonly shape: TrainerShape,
  ) {
    const { G, B, Tmax, poolSize, evalTmax } = shape;
    if (G % 8 !== 0) throw new Error("the grid side must be a multiple of 8");
    this.device = device;
    this.N = B * G * G;
    this.sampleBytes = G * G * 64;
    this.stateBytes = this.N * 64;
    this.gemmSlots = Math.ceil(this.N / GEMM_CHUNK);
    const U = GPUBufferUsage;
    const S = U.STORAGE | U.COPY_SRC | U.COPY_DST;
    const lim = device.limits;
    if (this.stateBytes % lim.minStorageBufferOffsetAlignment !== 0) throw new Error("state size breaks the storage offset alignment");

    this.iterBuf = this.buf("uniforms", 32, U.UNIFORM | U.COPY_DST);
    this.stepBuf = this.buf("uniforms", (Tmax + 1 + evalTmax) * STEP_STRIDE, U.UNIFORM | U.COPY_DST);
    this.upload = this.buf("uniforms", UPLOAD_SLOTS * UPLOAD_STRIDE, U.COPY_SRC | U.COPY_DST);
    this.wUniform = this.buf("weights", NPARAM * 4, U.UNIFORM | U.COPY_DST);
    this.theta = this.buf("weights", NPARAM * 4, S);
    this.mom = this.buf("optimiser", NPARAM * 4, S);
    this.vel = this.buf("optimiser", NPARAM * 4, S);
    this.grad = this.buf("optimiser", NPARAM * 4, S);
    // checkpoints: Tmax + 1 states packed into buffers of at most 128 MiB (the default binding
    // limit). A step reads state t and writes t + 1, and one dispatch may not read and write the
    // same buffer even at different offsets, so even and odd steps live in separate buffers.
    const chunkCap = Math.min(lim.maxStorageBufferBindingSize, lim.maxBufferSize, 128 * 2 ** 20);
    const perChunk = Math.max(1, Math.floor(chunkCap / this.stateBytes));
    for (let parity = 0; parity < 2; parity += 1) {
      const ts: number[] = [];
      for (let t = parity; t <= Tmax; t += 2) ts.push(t);
      for (let k = 0; k < ts.length; k += perChunk) {
        const part = ts.slice(k, k + perChunk);
        const chunk = this.buf("state checkpoints", part.length * this.stateBytes, S);
        part.forEach((t, i) => {
          this.states[t] = { buffer: chunk, offset: i * this.stateBytes };
        });
      }
    }
    this.xmid = this.buf("forward temp", this.stateBytes, S);
    this.alive = this.buf("alive masks", Math.max(1, Tmax) * this.N * 4, S);
    this.target = this.buf("target", G * G * 16, S);
    this.gbuf = [this.buf("state gradient", this.stateBytes, S), this.buf("state gradient", this.stateBytes, S)];
    this.lossPart = this.buf("loss", B * (G / 8) * (G / 8) * 4, S);
    this.lossOut = this.buf("loss", (B + 1) * 4, S);
    this.idxBuf = this.buf("pool", Math.max(B, 4) * 4, S);
    this.poolLoss = this.buf("pool", Math.max(poolSize, 1) * 4, S);
    this.scratch = this.buf("backward scratch", this.N * SCRATCH_VEC4 * 16, S);
    this.gp = this.buf("backward scratch", this.N * 12 * 16, S);
    this.partial = this.buf("weight-gradient partials", this.gemmSlots * NPARAM * 4, S);
    this.reduceParams = this.buf("uniforms", 16, U.UNIFORM | U.COPY_DST);
    this.adamParams = this.buf("uniforms", 32, U.UNIFORM | U.COPY_DST);
    // the pool is only ever copied (never bound), so it lives in chunks of whatever size fits
    this.poolPerChunk = Math.max(1, Math.floor(Math.min(lim.maxBufferSize, 128 * 2 ** 20) / this.sampleBytes));
    for (let i = 0; i < poolSize; i += this.poolPerChunk) {
      const n = Math.min(this.poolPerChunk, poolSize - i);
      this.pool.push(this.buf("pool", n * this.sampleBytes, U.COPY_SRC | U.COPY_DST));
    }

    // step entries: training t (alive slot t), evaluation Tmax+1+t (alive slot 0)
    const steps = new Uint32Array(((Tmax + 1 + evalTmax) * STEP_STRIDE) / 4);
    for (let t = 0; t <= Tmax; t += 1) {
      steps[(t * STEP_STRIDE) / 4] = t;
      steps[(t * STEP_STRIDE) / 4 + 1] = Math.min(t, Math.max(0, Tmax - 1));
    }
    for (let t = 0; t < evalTmax; t += 1) steps[((Tmax + 1 + t) * STEP_STRIDE) / 4] = t;
    const q = device.queue;
    q.writeBuffer(this.stepBuf, 0, steps);
    q.writeBuffer(this.reduceParams, 0, new Uint32Array([this.gemmSlots, 0, 0, 0]));

    const st = { buffer: this.stepBuf, offset: 0, size: 16 };
    const it = this.iterBuf;
    const s = (t: number): GPUBufferBinding => ({ buffer: this.states[t]!.buffer, offset: this.states[t]!.offset, size: this.stateBytes });
    const g = (t: number): GPUBuffer => this.gbuf[t % 2]!;
    const fwdMlp: GPUBindGroup[] = [];
    const fwdMask: GPUBindGroup[] = [];
    const loss: GPUBindGroup[] = [];
    const bwdMlp: GPUBindGroup[] = [];
    const gather: GPUBindGroup[] = [];
    for (let t = 0; t < Math.max(Tmax, 2); t += 1) {
      const tt = Math.min(t, Tmax);
      fwdMlp.push(this.group("fwdMlp", [it, st, this.wUniform, s(tt), this.xmid]));
      fwdMask.push(this.group("fwdMask", [it, st, s(tt), this.xmid, s(Math.min(tt + 1, Tmax)), this.alive]));
      bwdMlp.push(this.group("bwdMlp", [it, st, this.wUniform, s(tt), g(t + 1), this.alive, this.scratch, this.gp]));
      gather.push(this.group("gather", [it, st, g(t + 1), this.alive, this.gp, g(t)]));
    }
    for (let T = 0; T <= Tmax; T += 1) loss.push(this.group("loss", [it, st, s(T), this.target, g(T), this.lossPart]));
    this.bg = {
      fwdMlp,
      fwdMask,
      fwdMaskEvalBack: this.group("fwdMask", [it, st, s(1), this.xmid, s(0), this.alive]),
      loss,
      lossReduce: this.group("lossReduce", [it, st, this.lossPart, this.lossOut, this.idxBuf, this.poolLoss]),
      bwdMlp,
      gather,
      gemm: this.group("gemm", [it, st, this.alive, this.scratch, this.partial]),
      gradReduce: this.group("gradReduce", [this.reduceParams, this.partial, this.grad]),
      adam: this.group("adam", [this.adamParams, this.grad, this.theta, this.mom, this.vel]),
      seedFill: this.group("seedFill", [it, st, this.idxBuf, this.poolLoss, s(0)]),
      damage: this.group("damage", [it, st, this.idxBuf, this.poolLoss, s(0)]),
    };
  }

  // ------------------------------------------------------------ plumbing

  private buf(role: string, size: number, usage: number): GPUBuffer {
    const b = this.device.createBuffer({ size: Math.ceil(size / 16) * 16, usage, label: `teach-${role}` });
    this.memory[role] = (this.memory[role] ?? 0) + b.size;
    this.buffers.push(b);
    return b;
  }

  get totalBytes(): number {
    return Object.values(this.memory).reduce((a, b) => a + b, 0);
  }

  private group(name: KernelName, res: (GPUBuffer | GPUBufferBinding)[]): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.kernels.k[name].bgl,
      entries: res.map((r, binding) => ({ binding, resource: r instanceof GPUBuffer ? { buffer: r } : r })),
      label: `teach-${name}`,
    });
  }

  private dispatch(pass: GPUComputePassEncoder, name: KernelName, bg: GPUBindGroup, stepEntry: number | null, wg: [number, number, number]): void {
    pass.setPipeline(this.kernels.k[name].pipe);
    if (stepEntry === null) pass.setBindGroup(0, bg);
    else pass.setBindGroup(0, bg, [stepEntry * STEP_STRIDE]);
    pass.dispatchWorkgroups(wg[0], wg[1], wg[2]);
  }

  private cells(b = this.shape.B): [number, number, number] {
    return [this.shape.G / 8, this.shape.G / 8, b];
  }

  /** Stage an Iter (+ Adam, + pool draw) record and copy it into place in `enc`. */
  private stageIter(enc: GPUCommandEncoder, seed: number, mode: number, B: number, adam: { lr: number; step: number } | null, idx: number[] | null): void {
    const { G, poolSize } = this.shape;
    const a = new ArrayBuffer(UPLOAD_STRIDE);
    const u = new Uint32Array(a);
    const f = new Float32Array(a);
    u[0] = G;
    u[1] = B;
    u[2] = seed >>> 0;
    u[3] = B * G * G;
    f[4] = 2 / (B * 4 * G * G); // dL/dx for L = mean over B·4·G·G
    u[5] = 1 << 23; // fire rate 0.5
    u[6] = mode;
    u[7] = poolSize;
    if (adam) {
      const b1 = 0.9;
      const b2 = 0.999;
      f[8] = adam.lr;
      f[9] = b1;
      f[10] = b2;
      f[11] = 1e-8;
      f[12] = 1 - b1 ** adam.step;
      f[13] = 1 - b2 ** adam.step;
      u[14] = 1; // per-tensor gradient normalisation (Distill)
    }
    if (idx) u.set(idx, IDX_OFF / 4);
    const off = this.uploadSlot * UPLOAD_STRIDE;
    this.uploadSlot = (this.uploadSlot + 1) % UPLOAD_SLOTS;
    this.device.queue.writeBuffer(this.upload, off, a);
    enc.copyBufferToBuffer(this.upload, off, this.iterBuf, 0, 32);
    if (adam) enc.copyBufferToBuffer(this.upload, off + 32, this.adamParams, 0, 32);
    if (idx) enc.copyBufferToBuffer(this.upload, off + IDX_OFF, this.idxBuf, 0, Math.ceil((idx.length * 4) / 4) * 4);
  }

  // ----------------------------------------------------------- data in

  /** Replace the weights (trainer layout) and zero Adam's moments. */
  setParams(v: Float32Array<ArrayBuffer>): void {
    if (v.length !== NPARAM) throw new Error("bad parameter count");
    const q = this.device.queue;
    q.writeBuffer(this.theta, 0, v);
    q.writeBuffer(this.wUniform, 0, v);
    const z = new Float32Array(NPARAM);
    q.writeBuffer(this.mom, 0, z);
    q.writeBuffer(this.vel, 0, z);
  }

  /** PyTorch Conv2d's default init for W1 and b1 from a counter hash, zero W2 (the paper's zero-init last layer). */
  static initParams(seed: number): Float32Array<ArrayBuffer> {
    const v = new Float32Array(NPARAM);
    const hs = new HashStream(seed, 77);
    const bound = 1 / Math.sqrt(48);
    for (let k = 0; k < 6144 + 128; k += 1) v[k] = hs.range(-bound, bound);
    return v;
  }

  /** The target: G × G premultiplied RGBA. */
  setTarget(rgba: Float32Array<ArrayBuffer>): void {
    if (rgba.length !== this.shape.G * this.shape.G * 4) throw new Error("bad target size");
    this.device.queue.writeBuffer(this.target, 0, rgba);
  }

  /** Write the start cells of a rollout (every sample, cell-major 16 channels). */
  writeStart(cells: Float32Array<ArrayBuffer>): void {
    const s = this.states[0]!;
    this.device.queue.writeBuffer(s.buffer, s.offset, cells);
  }

  /** Every pool sample back to the seed cell, every pool loss to zero. */
  resetPool(): void {
    const { G } = this.shape;
    const enc = this.device.createCommandEncoder({ label: "teach-pool-reset" });
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
    return [this.pool[c]!, (i - c * this.poolPerChunk) * this.sampleBytes];
  }

  // ------------------------------------------------- one iteration, in units
  // An iteration is: begin (outside a pass), prep, T × forward, loss,
  // T × backward (t = T−1 … 0), optimiser (passes), end (outside a pass).

  /** Copies that open an iteration: the uniforms, the pool draw into states[0], the gradient partials cleared. */
  beginIter(enc: GPUCommandEncoder, p: IterPlan): void {
    const { B } = this.shape;
    const mode = (p.pool ? 1 : 0) | (p.pool && p.damage > 0 ? 4 | (Math.min(p.damage, 255) << 8) : 0);
    this.stageIter(enc, p.seed, mode, B, p.adam ? { lr: p.lr, step: p.adamStep } : null, p.pool);
    if (p.pool) {
      const s0 = this.states[0]!;
      for (let b = 0; b < B; b += 1) {
        const [buf, off] = this.poolAt(p.pool[b]!);
        enc.copyBufferToBuffer(buf, off, s0.buffer, s0.offset + b * this.sampleBytes, this.sampleBytes);
      }
    }
    enc.clearBuffer(this.partial);
  }

  /** Pool draw: the worst sample back to the seed (+ damage); no pool: seed every sample, or keep the given start. */
  prep(pass: GPUComputePassEncoder, p: IterPlan): void {
    const cells = this.cells();
    const damage = !!p.pool && p.damage > 0;
    if (damage) {
      // the drawn samples' current losses first, so the reset and the damage rank the batch as it is now
      this.dispatch(pass, "loss", this.bg.loss[0]!, 0, cells);
      this.dispatch(pass, "lossReduce", this.bg.lossReduce, 0, [1, 1, 1]);
    }
    if (p.pool || p.seedAll) this.dispatch(pass, "seedFill", this.bg.seedFill, 0, cells);
    if (damage) this.dispatch(pass, "damage", this.bg.damage, 0, cells);
  }

  forward(pass: GPUComputePassEncoder, t: number): void {
    const cells = this.cells();
    this.dispatch(pass, "fwdMlp", this.bg.fwdMlp[t]!, t, cells);
    this.dispatch(pass, "fwdMask", this.bg.fwdMask[t]!, t, cells);
  }

  loss(pass: GPUComputePassEncoder, T: number): void {
    this.dispatch(pass, "loss", this.bg.loss[T]!, 0, this.cells());
    this.dispatch(pass, "lossReduce", this.bg.lossReduce, 0, [1, 1, 1]);
  }

  backward(pass: GPUComputePassEncoder, t: number): void {
    this.dispatch(pass, "bwdMlp", this.bg.bwdMlp[t]!, t, this.cells());
    this.dispatch(pass, "gemm", this.bg.gemm, t, [this.gemmSlots, 1, 1]);
    if (t > 0) this.dispatch(pass, "gather", this.bg.gather[t]!, t, this.cells());
  }

  optimise(pass: GPUComputePassEncoder, adam: boolean): void {
    this.dispatch(pass, "gradReduce", this.bg.gradReduce, null, [Math.ceil(2080 / 64), 1, 1]);
    if (adam) this.dispatch(pass, "adam", this.bg.adam, null, [1, 1, 1]);
  }

  /** Copies that close an iteration: the new weights into the uniform, the batch back into the pool. */
  endIter(enc: GPUCommandEncoder, p: IterPlan): void {
    if (p.adam) enc.copyBufferToBuffer(this.theta, 0, this.wUniform, 0, NPARAM * 4);
    if (p.pool) {
      const sT = this.states[p.T]!;
      for (let b = 0; b < this.shape.B; b += 1) {
        const [buf, off] = this.poolAt(p.pool[b]!);
        enc.copyBufferToBuffer(sT.buffer, sT.offset + b * this.sampleBytes, buf, off, this.sampleBytes);
      }
    }
  }

  /** Copy sample `b` of the state after step T (cell-major, 16 channels) into `dst`. */
  copySample(enc: GPUCommandEncoder, T: number, b: number, dst: GPUBuffer, dstOffset = 0): void {
    const s = this.states[T]!;
    enc.copyBufferToBuffer(s.buffer, s.offset + b * this.sampleBytes, dst, dstOffset, this.sampleBytes);
  }

  // --------------------------------------- evaluation: forward only, from the seed

  /** Open an evaluation rollout of `B` samples (≤ the batch) from the seed cell. */
  beginEval(enc: GPUCommandEncoder, seed: number, B: number): void {
    this.stageIter(enc, seed, 0, Math.min(B, this.shape.B), null, null);
  }

  evalSeed(pass: GPUComputePassEncoder, B: number): void {
    this.dispatch(pass, "seedFill", this.bg.seedFill, 0, this.cells(B));
  }

  /** Evaluation step t (ping-pong through states 0 and 1). */
  evalStep(pass: GPUComputePassEncoder, t: number, B: number): void {
    if (t >= this.shape.evalTmax) throw new Error("evaluation rollout longer than evalTmax");
    const e = this.shape.Tmax + 1 + t;
    const cur = t % 2;
    this.dispatch(pass, "fwdMlp", this.bg.fwdMlp[cur]!, e, this.cells(B));
    this.dispatch(pass, "fwdMask", cur === 0 ? this.bg.fwdMask[0]! : this.bg.fwdMaskEvalBack, e, this.cells(B));
  }

  /** Copy the evaluation state after `steps` steps (the first B samples) into `dst`. */
  copyEval(enc: GPUCommandEncoder, steps: number, B: number, dst: GPUBuffer, dstOffset = 0): void {
    const s = this.states[steps % 2]!;
    enc.copyBufferToBuffer(s.buffer, s.offset, dst, dstOffset, B * this.sampleBytes);
  }

  destroy(): void {
    for (const b of this.buffers) b.destroy();
  }
}

/** Rollout length, fire-mask seed and pool draw of iteration i of a run (counter hashes: same run seed ⇒ same plan). */
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
