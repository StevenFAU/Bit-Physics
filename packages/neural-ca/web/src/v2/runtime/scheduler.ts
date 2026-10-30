// Frame work scheduler — the seam Teach (M2) trains through.
//
// The training spike (docs/planning/rebuild-v2/04-neural-ca.md, status note)
// measured one T3 training iteration at ~19 ms of GPU time: longer than a
// 60 fps frame. So GPU work that is not the live dish runs as *sliced jobs*:
// each frame the dish's own steps go first, then every background job gets a
// share of what is left of a per-frame GPU budget, encoded at the job's unit
// boundaries (a solver step; for M2 a forward or backward step of a training
// rollout) into the frame's one command encoder. A job's cost per unit is
// measured (GPU timestamps when the device has them, the frame's own time
// otherwise), so the slices fit the frame on any GPU. In M0 the consumer is
// Prove's "live dish ≡ gated kernel" run, which steps a scratch solver
// through the canonical 1000 steps while the dish keeps rendering.

/** What the scheduler needs of a GPU command encoder (structural, so tests run without WebGPU). */
export type EncoderLike = object;

export interface SlicedJob<E extends EncoderLike = GPUCommandEncoder> {
  /** Names the job's timing (profiler pass name). */
  readonly name: string;
  /** Units still to run (0 = finished). */
  remaining(): number;
  /** Most units the job can take before its next await (e.g. a readback boundary). */
  maxUnits?(): number;
  /** Record up to `units` units into `enc`; return how many were recorded. */
  encode(enc: E, units: number, timestampWrites?: GPUComputePassTimestampWrites): number;
  /** After the frame's submit: readbacks, progress. The job is not encoded again until this resolves. */
  afterSubmit?(): Promise<void> | void;
}

export interface SchedulerOptions {
  /** GPU ms per frame that all compute — the dish's steps and the jobs — may use. */
  budgetMs: number;
  /** Assumed ms per unit before anything is measured. */
  defaultUnitMs?: number;
  /** Units a job always gets per frame (progress is guaranteed). */
  minUnits?: number;
  maxUnits?: number;
}

interface Entry<E extends EncoderLike> {
  job: SlicedJob<E>;
  waiting: boolean;
  ranThisFrame: number;
  resolve: () => void;
  reject: (e: unknown) => void;
  failed: boolean;
}

const EMA = 0.15;

export class FrameScheduler<E extends EncoderLike = GPUCommandEncoder> {
  budgetMs: number;
  private readonly defaultUnitMs: number;
  private readonly minUnits: number;
  private readonly maxUnits: number;
  /** Measured GPU ms per unit, by name. */
  private readonly unitMs = new Map<string, number>();
  /** Units recorded per frame (EMA), by name — pairs with the profiler's per-pass ms. */
  private readonly unitsEma = new Map<string, number>();
  private readonly entries: Entry<E>[] = [];
  /** Frames in which each job name recorded work (readouts: "spread over N frames"). */
  private readonly slices = new Map<string, number>();

  constructor(o: SchedulerOptions) {
    this.budgetMs = o.budgetMs;
    this.defaultUnitMs = o.defaultUnitMs ?? 0.25;
    this.minUnits = o.minUnits ?? 1;
    this.maxUnits = o.maxUnits ?? 128;
  }

  /** Measured (or assumed) GPU ms per unit of `name`. */
  costOf(name: string): number {
    return this.unitMs.get(name) ?? this.defaultUnitMs;
  }

  /** How many units of `name` fit in `ms` (clamped to [min, max]). */
  unitsFor(name: string, ms: number, min = this.minUnits, max = this.maxUnits): number {
    const fit = Math.floor(Math.max(0, ms) / Math.max(this.costOf(name), 1e-4));
    return Math.max(min, Math.min(max, fit));
  }

  /** Record that `units` units of `name` were encoded this frame (feeds the per-unit cost). */
  noteUnits(name: string, units: number): void {
    const prev = this.unitsEma.get(name);
    this.unitsEma.set(name, prev === undefined ? units : prev + (units - prev) * EMA);
  }

  /**
   * A measured GPU time for `name`'s pass in a recent frame. With timestamp
   * queries the profiler reports per-pass ms a few frames late, so the cost
   * pairs it with the EMA of units per frame rather than one frame's count.
   */
  observe(name: string, ms: number): void {
    const u = this.unitsEma.get(name);
    if (u === undefined || u < 0.5 || !(ms >= 0)) return;
    const per = ms / u;
    const prev = this.unitMs.get(name);
    this.unitMs.set(name, prev === undefined ? per : prev + (per - prev) * EMA);
  }

  /** Teach the cost directly (no timestamp queries: from a timed calibration run). */
  setCost(name: string, msPerUnit: number): void {
    if (msPerUnit > 0 && Number.isFinite(msPerUnit)) this.unitMs.set(name, msPerUnit);
  }

  /** Frames in which jobs named `name` recorded at least one unit, since the page started. */
  slicesOf(name: string): number {
    return this.slices.get(name) ?? 0;
  }

  /** Queue a job; resolves when it has no units left (rejects if a slice throws). */
  add(job: SlicedJob<E>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.entries.push({ job, waiting: false, ranThisFrame: 0, resolve, reject, failed: false });
    });
  }

  get busy(): boolean {
    return this.entries.length > 0;
  }

  /** Jobs currently queued (names), for readouts. */
  get queued(): string[] {
    return this.entries.map((e) => e.job.name);
  }

  /**
   * Record this frame's background work after the foreground (the dish's
   * steps) used an estimated `usedMs` of the budget. Jobs share what is left
   * equally; each gets at least `minUnits`, so a job never stalls.
   */
  encodeJobs(enc: E, usedMs: number, pass?: (name: string) => GPUComputePassTimestampWrites | undefined): void {
    const ready = this.entries.filter((e) => !e.waiting && !e.failed);
    const left = Math.max(0, this.budgetMs - usedMs);
    const share = ready.length > 0 ? left / ready.length : 0;
    for (const e of ready) {
      e.ranThisFrame = 0;
      const rem = e.job.remaining();
      if (rem <= 0) continue;
      const cap = Math.min(rem, e.job.maxUnits?.() ?? rem);
      const want = Math.min(cap, this.unitsFor(e.job.name, share));
      if (want <= 0) continue;
      try {
        e.ranThisFrame = e.job.encode(enc, want, pass?.(e.job.name));
      } catch (err) {
        e.failed = true;
        e.reject(err);
        continue;
      }
      this.noteUnits(e.job.name, e.ranThisFrame);
      if (e.ranThisFrame > 0) this.slices.set(e.job.name, this.slicesOf(e.job.name) + 1);
    }
  }

  /** After the frame's submit: run each job's follow-up, retire finished jobs. */
  afterSubmit(): void {
    for (const e of this.entries.slice()) {
      if (e.failed) {
        this.retire(e);
        continue;
      }
      // A later frame must not retire a finished job until the final slice's
      // follow-up (e.g. the last proof readback) has resolved.
      if (e.waiting) continue;
      if (e.ranThisFrame === 0 && e.job.remaining() > 0) continue;
      const done = (): void => {
        e.waiting = false;
        if (e.job.remaining() <= 0) {
          this.retire(e);
          e.resolve();
        }
      };
      const r = e.ranThisFrame > 0 ? e.job.afterSubmit?.() : undefined;
      e.ranThisFrame = 0;
      if (r instanceof Promise) {
        e.waiting = true;
        r.then(done, (err: unknown) => {
          e.waiting = false;
          e.failed = true;
          this.retire(e);
          e.reject(err);
        });
      } else {
        done();
      }
    }
  }

  private retire(e: Entry<E>): void {
    const i = this.entries.indexOf(e);
    if (i >= 0) this.entries.splice(i, 1);
  }

  /** Drop every queued job (scene change, device loss); their promises reject. */
  cancelAll(reason = "cancelled"): void {
    for (const e of this.entries.splice(0)) e.reject(new Error(reason));
  }
}
