// Training as a sliced job (Teach, M2). The spike measured a T3 iteration at
// ~19 ms of GPU time, longer than a 60 fps frame, so an iteration is cut into
// units (teach/trainer.ts) and the FrameScheduler (runtime/scheduler.ts)
// records as many as fit the frame's GPU budget into the frame's own encoder,
// after the dish's steps and before the render. Units are weighted by cost
// (the spike's kernel times: a backward step costs about two forward steps),
// so a frame of backward work and a frame of forward work take about as long.
//
// Nothing here waits on the GPU: losses, evaluation frames and weights come
// back through readbacks mapped after the frame's submit. The plan of every
// iteration (rollout length, fire-mask seed, pool draw) is a counter hash of
// the run seed, and the worst-sample reset is decided on the GPU, so the same
// run seed on the same adapter gives the same weights however the iterations
// fall into frames.

import type { SlicedJob } from "../runtime/scheduler.js";
import type { Fit } from "./metrics.js";
import { fit } from "./metrics.js";
import type { IterPlan, NcaTrainer } from "./trainer.js";
import { NPARAM, schedule } from "./trainer.js";

export const TEACH_JOB = "teach";

/** Unit weights (≈ a forward step's GPU time each). */
const W_BEGIN = 1;
const W_FWD = 1;
const W_LOSS = 1;
const W_BWD = 2;
const W_OPT = 1;
const W_EVAL = 1;
const LOSS_RING = 16;
/** Evaluations always draw the same fire masks, so one evaluation compares with the next. */
export const EVAL_SEED = 0x0e7a1;

export interface TrainConfig {
  Tmin: number;
  Tmax: number;
  lr: number;
  /** Learning rate ×0.1 from this iteration on. */
  decayAt: number;
  /** Damage this many samples per batch (Distill "Regenerating")… */
  damage: number;
  /** …from this iteration on. */
  damageFrom: number;
  runSeed: number;
  /** Evaluate (grow from one cell) every this many iterations (0: never). */
  evalEvery: number;
  /** Evaluation checkpoints (steps from the seed), ascending; the last is the rollout length. */
  evalSteps: number[];
  /** Samples grown per evaluation. */
  evalB: number;
}

export interface EvalResult {
  /** Iterations trained when the evaluation ran. */
  iter: number;
  /** Fit at each evaluation checkpoint, keyed by steps. */
  fits: Record<number, Fit>;
  /** RGBA (clamped, first sample) at the last checkpoint. */
  rgba: Float32Array;
}

export interface TrainEvents {
  onLoss?: (iter: number, loss: number, sampleLoss: number[]) => void;
  onEval?: (e: EvalResult) => void;
  /** The batch display buffers were refreshed (after iteration `iter`). */
  onDisplay?: (iter: number) => void;
}

type Task =
  | { kind: "iter"; i: number; plan: IterPlan; stage: "begin" | "fwd" | "loss" | "bwd" | "opt"; t: number }
  | { kind: "eval"; iter: number; stage: "begin" | "step"; t: number; reads: { steps: number; buf: GPUBuffer }[] };

function taskUnits(k: Task): number {
  if (k.kind === "eval") {
    const total = k.reads[k.reads.length - 1]!.steps;
    return (k.stage === "begin" ? W_BEGIN : 0) + (total - k.t) * W_EVAL;
  }
  const T = k.plan.T;
  switch (k.stage) {
    case "begin":
      return W_BEGIN + T * W_FWD + W_LOSS + T * W_BWD + W_OPT;
    case "fwd":
      return (T - k.t) * W_FWD + W_LOSS + T * W_BWD + W_OPT;
    case "loss":
      return W_LOSS + T * W_BWD + W_OPT;
    case "bwd":
      return (k.t + 1) * W_BWD + W_OPT;
    default:
      return W_OPT;
  }
}

/** Units "left" while a run goes on with no end in sight. */
const OPEN_ENDED = 1 << 30;

export class TrainJob implements SlicedJob {
  readonly name = TEACH_JOB;
  /** Iterations recorded (they finish on the GPU shortly after). */
  iter = 0;
  /** Weighted units recorded since the run started. */
  unitsTotal = 0;
  private task: Task | null = null;
  private readonly queue: Task[] = [];
  private stopAt: number | null = null;
  private pausing = false;
  private readonly lossRing: { buf: GPUBuffer; state: "free" | "recorded" | "mapping"; iter: number }[] = [];
  private evalReads: Task[] = [];
  private weightWaiters: { buf: GPUBuffer; resolve: (v: Float32Array) => void; reject: (e: unknown) => void; recorded: boolean }[] = [];
  /** Buffers the batch is copied into after every iteration (one per sample), or null; asked at each iteration's end. */
  displayTargets: () => GPUBuffer[] | null = () => null;
  /** The latest pool draw (the batch now on display). */
  private lastPool: number[] | null = null;
  events: TrainEvents = {};

  constructor(
    readonly trainer: NcaTrainer,
    readonly cfg: TrainConfig | null,
    private readonly target: Float32Array,
  ) {
    for (let i = 0; i < LOSS_RING; i += 1) {
      this.lossRing.push({
        buf: trainer.device.createBuffer({ size: 256, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "teach-loss-read" }),
        state: "free",
        iter: -1,
      });
    }
  }

  /** Queue one iteration with an explicit plan (the gradient check: no pool, given start, no Adam). */
  enqueue(plan: IterPlan): void {
    this.queue.push({ kind: "iter", i: this.iter + this.queue.length, plan, stage: "begin", t: 0 });
  }

  /** Train until iteration `n` (null: until told to stop). */
  runUntil(n: number | null): void {
    this.stopAt = n;
    this.pausing = false;
  }

  /** Stop at the next iteration boundary (the scheduler then retires the job; runUntil + add resumes it). */
  pause(): void {
    this.pausing = true;
  }

  get atBoundary(): boolean {
    return this.task === null;
  }

  private nextPlan(): Task | null {
    const q = this.queue.shift();
    if (q) return q;
    const c = this.cfg;
    if (!c || this.pausing || (this.stopAt !== null && this.iter >= this.stopAt)) return null;
    const i = this.iter;
    if (c.evalEvery > 0 && i > 0 && i % c.evalEvery === 0 && !this.evalDoneAt.has(i)) {
      this.evalDoneAt.add(i);
      return this.evalTask(i);
    }
    const B = this.trainer.shape.B;
    const s = schedule(c.runSeed, i, c.Tmin, c.Tmax, B, this.trainer.shape.poolSize);
    return {
      kind: "iter",
      i,
      stage: "begin",
      t: 0,
      plan: {
        T: s.T,
        seed: s.seed,
        pool: s.pool,
        seedAll: s.pool === null,
        adam: true,
        lr: c.lr * (i < c.decayAt ? 1 : 0.1),
        adamStep: i + 1,
        damage: i >= c.damageFrom ? c.damage : 0,
      },
    };
  }

  private readonly evalDoneAt = new Set<number>();

  private evalTask(iter: number): Task {
    const c = this.cfg!;
    const bytes = c.evalB * this.trainer.sampleBytes;
    return {
      kind: "eval",
      iter,
      stage: "begin",
      t: 0,
      reads: c.evalSteps.map((steps) => ({
        steps,
        buf: this.trainer.device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "teach-eval-read" }),
      })),
    };
  }

  /** Grow from one cell now (at the next boundary), whatever the schedule says. */
  evaluateNow(): void {
    if (!this.cfg) return;
    this.evalDoneAt.add(this.iter);
    this.queue.unshift(this.evalTask(this.iter));
  }

  remaining(): number {
    let left = this.task ? taskUnits(this.task) : 0;
    for (const q of this.queue) left += taskUnits(q);
    const c = this.cfg;
    const more = !!c && !this.pausing && (this.stopAt === null || this.iter < this.stopAt);
    if (more) left += this.stopAt === null ? OPEN_ENDED : (this.stopAt - this.iter) * (W_BEGIN + c.Tmax * (W_FWD + W_BWD) + W_LOSS + W_OPT);
    return left;
  }

  /** The weights after the latest recorded iteration (trainer layout), read back after a frame. */
  readWeights(): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
      const buf = this.trainer.device.createBuffer({ size: NPARAM * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "teach-weights-read" });
      this.weightWaiters.push({ buf, resolve, reject, recorded: false });
    });
  }

  /** Copy the latest batch (back in the pool) onto the display now, with a submit of its own (the job is idle). */
  refreshDisplay(): void {
    const shown = this.displayTargets();
    if (!shown || !this.lastPool) return;
    const enc = this.trainer.device.createCommandEncoder({ label: "teach-display" });
    this.lastPool.forEach((idx, b) => {
      if (shown[b]) this.trainer.copyPoolSample(enc, idx, shown[b]!);
    });
    this.trainer.device.queue.submit([enc.finish()]);
    this.events.onDisplay?.(this.iter);
  }

  /** Read the weights now with a submit of its own (the job is idle: not queued, or between frames). */
  async readWeightsIdle(): Promise<Float32Array> {
    const d = this.trainer.device;
    const buf = d.createBuffer({ size: NPARAM * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "teach-weights-read" });
    const enc = d.createCommandEncoder({ label: "teach-weights" });
    enc.copyBufferToBuffer(this.trainer.theta, 0, buf, 0, NPARAM * 4);
    d.queue.submit([enc.finish()]);
    await buf.mapAsync(GPUMapMode.READ);
    const v = new Float32Array(buf.getMappedRange().slice(0));
    buf.destroy();
    return v;
  }

  encode(enc: GPUCommandEncoder, units: number, ts?: GPUComputePassTimestampWrites): number {
    const tr = this.trainer;
    // timestamps bracket the whole slice: begin on an empty first pass, end on an empty last one
    enc.beginComputePass(ts ? { timestampWrites: { querySet: ts.querySet, beginningOfPassWriteIndex: ts.beginningOfPassWriteIndex } } : {}).end();
    let pass: GPUComputePassEncoder | null = null;
    const open = (): GPUComputePassEncoder => (pass ??= enc.beginComputePass({ label: "teach" }));
    const close = (): void => {
      pass?.end();
      pass = null;
    };
    let used = 0;
    // weights asked for: copied at the slice's start (they change only at an optimiser step, none of which is earlier in this slice)
    for (const w of this.weightWaiters) {
      if (w.recorded) continue;
      enc.copyBufferToBuffer(tr.theta, 0, w.buf, 0, NPARAM * 4);
      w.recorded = true;
    }
    while (used < units) {
      if (!this.task) {
        this.task = this.nextPlan();
        if (!this.task) break;
      }
      const k = this.task;
      if (k.kind === "eval") {
        const B = this.cfg!.evalB;
        if (k.stage === "begin") {
          close();
          tr.beginEval(enc, EVAL_SEED, B);
          tr.evalSeed(open(), B);
          k.stage = "step";
          used += W_BEGIN;
          continue;
        }
        tr.evalStep(open(), k.t, B);
        k.t += 1;
        used += W_EVAL;
        const r = k.reads.find((x) => x.steps === k.t);
        if (r) {
          close();
          tr.copyEval(enc, k.t, B, r.buf);
        }
        if (k.t >= k.reads[k.reads.length - 1]!.steps) {
          this.evalReads.push(k);
          this.task = null;
        }
        continue;
      }
      const p = k.plan;
      switch (k.stage) {
        case "begin":
          close();
          tr.beginIter(enc, p);
          tr.prep(open(), p);
          k.stage = "fwd";
          k.t = 0;
          used += W_BEGIN;
          break;
        case "fwd":
          tr.forward(open(), k.t);
          k.t += 1;
          used += W_FWD;
          if (k.t >= p.T) k.stage = "loss";
          break;
        case "loss":
          tr.loss(open(), p.T);
          k.stage = "bwd";
          k.t = p.T - 1;
          used += W_LOSS;
          break;
        case "bwd":
          tr.backward(open(), k.t);
          k.t -= 1;
          used += W_BWD;
          if (k.t < 0) k.stage = "opt";
          break;
        case "opt": {
          tr.optimise(open(), p.adam);
          close();
          tr.endIter(enc, p);
          used += W_OPT;
          const slot = this.lossRing.find((s) => s.state === "free");
          if (slot) {
            enc.copyBufferToBuffer(tr.lossOut, 0, slot.buf, 0, (tr.shape.B + 1) * 4);
            slot.state = "recorded";
            slot.iter = k.i;
          }
          const shown = this.displayTargets();
          if (shown) {
            for (let b = 0; b < Math.min(shown.length, tr.shape.B); b += 1) tr.copySample(enc, p.T, b, shown[b]!);
            this.displayIter = k.i + 1;
          }
          if (p.pool) this.lastPool = p.pool.slice();
          this.iter = Math.max(this.iter, k.i + 1);
          this.task = null;
          break;
        }
      }
    }
    close();
    enc.beginComputePass(ts ? { timestampWrites: { querySet: ts.querySet, endOfPassWriteIndex: ts.endOfPassWriteIndex } } : {}).end();
    this.unitsTotal += used;
    return used;
  }

  private displayIter = -1;

  afterSubmit(): void {
    const B = this.trainer.shape.B;
    for (const s of this.lossRing) {
      if (s.state !== "recorded") continue;
      s.state = "mapping";
      const iter = s.iter;
      void s.buf.mapAsync(GPUMapMode.READ).then(
        () => {
          const l = new Float32Array(s.buf.getMappedRange().slice(0, (B + 1) * 4));
          s.buf.unmap();
          s.state = "free";
          this.events.onLoss?.(iter, l[B]!, Array.from(l.slice(0, B)));
        },
        () => {
          s.state = "free";
        },
      );
    }
    for (const k of this.evalReads.splice(0)) {
      if (k.kind !== "eval") continue;
      void this.finishEval(k);
    }
    for (const w of this.weightWaiters.filter((x) => x.recorded)) {
      this.weightWaiters.splice(this.weightWaiters.indexOf(w), 1);
      void w.buf.mapAsync(GPUMapMode.READ).then(
        () => {
          const v = new Float32Array(w.buf.getMappedRange().slice(0));
          w.buf.destroy();
          w.resolve(v);
        },
        (e: unknown) => {
          w.buf.destroy();
          w.reject(e);
        },
      );
    }
    if (this.displayIter >= 0) {
      const i = this.displayIter;
      this.displayIter = -1;
      this.events.onDisplay?.(i);
    }
  }

  private async finishEval(k: Extract<Task, { kind: "eval" }>): Promise<void> {
    const G = this.trainer.shape.G;
    const B = this.cfg!.evalB;
    const fits: Record<number, Fit> = {};
    let rgba = new Float32Array(0);
    for (const r of k.reads) {
      try {
        await r.buf.mapAsync(GPUMapMode.READ);
        const cells = new Float32Array(r.buf.getMappedRange().slice(0));
        fits[r.steps] = fit(cells, this.target, G, B);
        if (r === k.reads[k.reads.length - 1]) {
          rgba = new Float32Array(G * G * 4);
          for (let c = 0; c < G * G; c += 1) for (let ch = 0; ch < 4; ch += 1) rgba[c * 4 + ch] = Math.min(1, Math.max(0, cells[c * 16 + ch]!));
        }
      } finally {
        r.buf.destroy();
      }
    }
    this.events.onEval?.({ iter: k.iter, fits, rgba });
  }

  destroy(): void {
    for (const s of this.lossRing) if (s.state !== "mapping") s.buf.destroy();
    for (const w of this.weightWaiters) {
      w.buf.destroy();
      w.reject(new Error("training stopped"));
    }
    this.weightWaiters = [];
  }
}
