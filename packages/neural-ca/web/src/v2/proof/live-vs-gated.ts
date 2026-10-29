// "The live dish is the gated kernel": the live solver (model/live.ts — one
// Params slot per step, a frame's steps in one pass and one submit) stepped
// through the canonical protocol on scratch buffers, read back at the gate's
// 21 capture points, and compared bit for bit with the gate path's own run on
// the same GPU. It runs as a sliced job (runtime/scheduler.ts), a few steps
// per frame inside the frame budget, so the dish keeps rendering meanwhile —
// the same path Teach's training will take in M2.

import type { Checkpoint } from "./gate.js";
import { CANONICAL_SEED, CANONICAL_STEPS, CAPTURE_EVERY, CN, FIRE_RATE, GRID, seedState } from "./gate.js";
import type { LiveKernels } from "../model/live.js";
import { LiveNca } from "../model/live.js";
import type { SlicedJob } from "../runtime/scheduler.js";

export const LIVE_JOB = "proof-live";

export class LiveVsGatedJob implements SlicedJob {
  readonly name = LIVE_JOB;
  readonly frames: Float32Array[] = [];
  /** Frames recorded per frame of the page (for the readout). */
  slices = 0;
  private readonly sim: LiveNca;
  private readonly device: GPUDevice;
  private pending: GPUBuffer[] = [];
  private recordedFirst = false;
  onProgress: ((step: number) => void) | null = null;

  /** `make`: another solver to step through the same protocol (Chimera's one-rule dish); by default the live solver. */
  constructor(device: GPUDevice, kernels: LiveKernels, ck: Checkpoint, make?: (cfg: { grid: number; seed: number; fireRate: number }) => LiveNca) {
    this.device = device;
    const cfg = { grid: GRID, seed: CANONICAL_SEED, fireRate: FIRE_RATE };
    this.sim = make ? make(cfg) : new LiveNca(device, kernels, ck, cfg);
    this.sim.load(seedState(GRID));
  }

  remaining(): number {
    return CANONICAL_STEPS - this.sim.tick;
  }

  /** Stop at every capture point, so its readback sees exactly that step. */
  maxUnits(): number {
    return CAPTURE_EVERY - (this.sim.tick % CAPTURE_EVERY);
  }

  private record(enc: GPUCommandEncoder): void {
    const rb = this.device.createBuffer({
      size: this.sim.stateBytes,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      label: "proof-live-read",
    });
    enc.copyBufferToBuffer(this.sim.state, 0, rb, 0, this.sim.stateBytes);
    this.pending.push(rb);
  }

  encode(enc: GPUCommandEncoder, units: number, timestampWrites?: GPUComputePassTimestampWrites): number {
    if (!this.recordedFirst) {
      this.record(enc);
      this.recordedFirst = true;
    }
    const n = this.sim.encodeSteps(enc, units, timestampWrites);
    if (n > 0 && this.sim.tick % CAPTURE_EVERY === 0) this.record(enc);
    this.slices += 1;
    return n;
  }

  async afterSubmit(): Promise<void> {
    const reads = this.pending;
    this.pending = [];
    for (const rb of reads) {
      try {
        await rb.mapAsync(GPUMapMode.READ);
        const full = new Float32Array(rb.getMappedRange().slice(0));
        const cells = GRID * GRID;
        const rgba = new Float32Array(cells * 4);
        for (let c = 0; c < cells; c += 1) {
          for (let ch = 0; ch < 4; ch += 1) rgba[c * 4 + ch] = Math.min(1, Math.max(0, full[c * CN + ch] ?? 0));
        }
        this.frames.push(rgba);
      } finally {
        rb.destroy();
      }
    }
    this.onProgress?.(this.sim.tick);
  }

  destroy(): void {
    for (const rb of this.pending) rb.destroy();
    this.sim.destroy();
  }
}

export interface FrameDiff {
  identical: boolean;
  /** Frames compared. */
  frames: number;
  /** Values (rgba floats) whose bits differ, over all frames. */
  differing: number;
  maxAbs: number;
}

/** Bit-for-bit comparison of two frame sequences. */
export function compareFrames(a: readonly Float32Array[], b: readonly Float32Array[]): FrameDiff {
  let differing = 0;
  let maxAbs = 0;
  const n = Math.min(a.length, b.length);
  for (let k = 0; k < n; k += 1) {
    const fa = a[k]!;
    const fb = b[k]!;
    const ua = new Uint32Array(fa.buffer, fa.byteOffset, fa.length);
    const ub = new Uint32Array(fb.buffer, fb.byteOffset, fb.length);
    for (let i = 0; i < ua.length; i += 1) {
      if (ua[i] !== ub[i]) {
        differing += 1;
        maxAbs = Math.max(maxAbs, Math.abs(fa[i]! - fb[i]!));
      }
    }
  }
  return { identical: differing === 0 && a.length === b.length, frames: n, differing, maxAbs };
}
