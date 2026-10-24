// Per-pass GPU timing (00-foundation.md § 4.6).
//
// With `timestamp-query`, each named pass gets a begin/end query pair; the
// query set is resolved into a buffer at the end of the frame and copied into
// one of a small ring of staging buffers, mapped asynchronously (never waited
// on). Without the feature the profiler falls back to submit→done latency of
// the whole frame (`queue.onSubmittedWorkDone`), which over-counts queueing
// but still moves with load — the source is reported so readouts say which.
//
// Browsers may quantise timestamps (Chrome: 100 µs unless developer features
// are on); the EMA smooths that, and frame totals are what the governor uses.

export type TimingSource = "timestamp" | "submit-latency";

export interface PassTiming {
  name: string;
  /** Latest measurement, ms. */
  ms: number;
  /** Exponential moving average, ms. */
  avg: number;
}

const RING = 3;
const EMA = 0.1;

export class GpuProfiler {
  readonly source: TimingSource;
  private readonly querySet: GPUQuerySet | null = null;
  private readonly resolveBuf: GPUBuffer | null = null;
  private readonly staging: { buf: GPUBuffer; state: "free" | "recorded" | "mapping"; names: string[]; tag: number }[] = [];
  private names: string[] = [];
  private tag = 0;
  /** The tag given to `begin` for the latest measured frame (e.g. its solver steps). */
  frameTag = 0;
  private readonly passes = new Map<string, PassTiming>();
  /** Pass names of the latest measured frame (what timings() reports). */
  private latest: string[] = [];
  private submitT0 = 0;
  private latencyBusy = false;
  /** GPU time of the last measured frame, ms (sum of passes, or submit latency). */
  frameMs = 0;
  frameAvg = 0;
  /** Called with each completed frame measurement (for the governor). */
  onFrame: ((ms: number) => void) | null = null;

  constructor(
    private readonly device: GPUDevice,
    enabled: boolean,
    private readonly maxPasses = 24,
  ) {
    this.source = enabled ? "timestamp" : "submit-latency";
    if (!enabled) return;
    this.querySet = device.createQuerySet({ type: "timestamp", count: maxPasses * 2, label: "profiler" });
    const bytes = maxPasses * 2 * 8;
    this.resolveBuf = device.createBuffer({
      size: bytes,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      label: "profiler-resolve",
    });
    for (let i = 0; i < RING; i += 1) {
      this.staging.push({
        buf: device.createBuffer({
          size: bytes,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
          label: `profiler-staging-${i}`,
        }),
        state: "free",
        names: [],
        tag: 0,
      });
    }
  }

  /**
   * Start a frame: forget last frame's pass list. `tag` rides with the frame's
   * measurement and comes back as `frameTag` when it lands (frames resolve
   * asynchronously, a few behind) — e.g. how many solver steps it ran.
   */
  begin(tag = 0): void {
    this.names = [];
    this.tag = tag;
  }

  /** timestampWrites for a pass descriptor, or undefined (no feature / out of slots). */
  pass(name: string): GPUComputePassTimestampWrites | undefined {
    if (!this.querySet || this.names.length >= this.maxPasses) return undefined;
    const i = this.names.length;
    this.names.push(name);
    return { querySet: this.querySet, beginningOfPassWriteIndex: i * 2, endOfPassWriteIndex: i * 2 + 1 };
  }

  /** Record the resolve + copy at the end of the frame's encoder. */
  end(enc: GPUCommandEncoder): void {
    if (!this.querySet || !this.resolveBuf || this.names.length === 0) return;
    const slot = this.staging.find((s) => s.state === "free");
    if (!slot) return; // all staging buffers in flight: skip this frame
    const n = this.names.length;
    enc.resolveQuerySet(this.querySet, 0, n * 2, this.resolveBuf, 0);
    enc.copyBufferToBuffer(this.resolveBuf, 0, slot.buf, 0, n * 2 * 8);
    slot.state = "recorded";
    slot.names = this.names.slice();
    slot.tag = this.tag;
  }

  /** Call right after `queue.submit` of the frame. */
  submitted(): void {
    if (this.querySet) {
      for (const slot of this.staging) {
        if (slot.state !== "recorded") continue;
        slot.state = "mapping";
        void slot.buf.mapAsync(GPUMapMode.READ).then(
          () => {
            const t = new BigUint64Array(slot.buf.getMappedRange().slice(0, slot.names.length * 16));
            slot.buf.unmap();
            slot.state = "free";
            this.frameTag = slot.tag;
            this.ingest(slot.names, t);
          },
          () => {
            slot.state = "free";
          },
        );
      }
      return;
    }
    if (this.latencyBusy) return;
    this.latencyBusy = true;
    this.submitT0 = performance.now();
    void this.device.queue.onSubmittedWorkDone().then(() => {
      this.latencyBusy = false;
      this.record(performance.now() - this.submitT0);
    });
  }

  private ingest(names: string[], t: BigUint64Array): void {
    let total = 0;
    for (let i = 0; i < names.length; i += 1) {
      const b = t[i * 2]!;
      const e = t[i * 2 + 1]!;
      const ms = e > b ? Number(e - b) / 1e6 : 0;
      total += ms;
      const name = names[i]!;
      const prev = this.passes.get(name);
      if (prev) {
        prev.ms = ms;
        prev.avg += (ms - prev.avg) * EMA;
      } else {
        this.passes.set(name, { name, ms, avg: ms });
      }
    }
    this.latest = [...new Set(names)];
    this.record(total);
  }

  private record(ms: number): void {
    this.frameMs = ms;
    this.frameAvg = this.frameAvg === 0 ? ms : this.frameAvg + (ms - this.frameAvg) * EMA;
    this.onFrame?.(ms);
  }

  /**
   * Per-pass timings of the latest measured frame, in that frame's order.
   * A pass that stopped running (a scene change swapped renderers) drops out
   * instead of keeping its last value in the totals; its average resumes if
   * it runs again.
   */
  timings(): PassTiming[] {
    return this.latest.map((n) => this.passes.get(n)!);
  }

  destroy(): void {
    this.querySet?.destroy();
    this.resolveBuf?.destroy();
    for (const s of this.staging) s.buf.destroy();
  }
}
