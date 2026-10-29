// The trained-model card's regeneration score (spec § The proof): the
// Menagerie's protocol (packages/neural-ca/menagerie/build.py), run on the
// live kernel with the taught weights — grow 400 steps from one cell (mask
// seed 42), cut the right half, the bottom half or a disc of radius 9
// through the middle, grow 200 more, and score each against the target
// (IoU of alpha > 0.5). A sliced job, so the dish keeps rendering.

import type { Checkpoint } from "../proof/gate.js";
import { CANONICAL_SEED, CN, FIRE_RATE, GRID, seedState } from "../proof/gate.js";
import type { LiveKernels } from "../model/live.js";
import { LiveNca } from "../model/live.js";
import type { SlicedJob } from "../runtime/scheduler.js";
import { iouOf } from "./metrics.js";

export const REGROW_JOB = "teach-regrow";
export const CUT_AT = 400;
export const REGROW_AFTER = 200;
export const CUTS = ["right half", "bottom half", "middle disc"] as const;

export function cutMask(kind: (typeof CUTS)[number], x: number, y: number, g = GRID): boolean {
  const px = x + 0.5;
  const py = y + 0.5;
  const c = g / 2;
  if (kind === "right half") return px > c;
  if (kind === "bottom half") return py > c;
  return (px - c) ** 2 + (py - c) ** 2 <= 81;
}

export interface Regrowth {
  /** IoU with the target just before the cut (step 400). */
  before: number;
  /** IoU 200 steps after each cut. */
  after: Record<string, number>;
  mean: number;
}

export class RegrowJob implements SlicedJob {
  readonly name = REGROW_JOB;
  private readonly grow: LiveNca;
  private cut: LiveNca[] = [];
  private stage: 0 | 1 | 2 = 0;
  private read: GPUBuffer[] = [];
  result: Regrowth | null = null;
  private before = 0;

  constructor(
    private readonly device: GPUDevice,
    private readonly kernels: LiveKernels,
    private readonly ck: Checkpoint,
    private readonly target: Float32Array,
  ) {
    this.grow = new LiveNca(device, kernels, ck, { grid: GRID, seed: CANONICAL_SEED, fireRate: FIRE_RATE });
    this.grow.load(seedState(GRID));
  }

  remaining(): number {
    if (this.stage === 0) return CUT_AT - this.grow.tick + REGROW_AFTER;
    if (this.stage === 1) return CUT_AT + REGROW_AFTER - this.cut[0]!.tick;
    return 0;
  }

  maxUnits(): number {
    return this.stage === 0 ? CUT_AT - this.grow.tick : this.stage === 1 ? CUT_AT + REGROW_AFTER - this.cut[0]!.tick : 0;
  }

  private readback(enc: GPUCommandEncoder, sim: LiveNca): void {
    const rb = this.device.createBuffer({ size: sim.stateBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "teach-regrow-read" });
    enc.copyBufferToBuffer(sim.state, 0, rb, 0, sim.stateBytes);
    this.read.push(rb);
  }

  encode(enc: GPUCommandEncoder, units: number, ts?: GPUComputePassTimestampWrites): number {
    if (this.stage === 0) {
      const n = this.grow.encodeSteps(enc, Math.min(units, CUT_AT - this.grow.tick), ts);
      if (this.grow.tick >= CUT_AT) this.readback(enc, this.grow);
      return n;
    }
    if (this.stage === 1) {
      const n = LiveNca.encodeStepsMany(enc, this.cut, Math.min(units, CUT_AT + REGROW_AFTER - this.cut[0]!.tick), ts);
      if (this.cut[0]!.tick >= CUT_AT + REGROW_AFTER) for (const s of this.cut) this.readback(enc, s);
      return n;
    }
    return 0;
  }

  async afterSubmit(): Promise<void> {
    if (this.read.length === 0) return;
    const bufs = this.read;
    this.read = [];
    const states: Float32Array<ArrayBuffer>[] = [];
    for (const rb of bufs) {
      try {
        await rb.mapAsync(GPUMapMode.READ);
        states.push(new Float32Array(rb.getMappedRange().slice(0)));
      } finally {
        rb.destroy();
      }
    }
    if (this.stage === 0) {
      const s = states[0]!;
      this.before = iouOf(s, this.target, GRID);
      this.cut = CUTS.map((kind) => {
        const c = s.slice();
        for (let y = 0; y < GRID; y += 1) for (let x = 0; x < GRID; x += 1) if (cutMask(kind, x, y)) c.fill(0, (y * GRID + x) * CN, (y * GRID + x + 1) * CN);
        const sim = new LiveNca(this.device, this.kernels, this.ck, { grid: GRID, seed: CANONICAL_SEED, fireRate: FIRE_RATE });
        sim.load(c, CUT_AT);
        return sim;
      });
      this.stage = 1;
      return;
    }
    const after: Record<string, number> = {};
    CUTS.forEach((k, i) => {
      after[k] = iouOf(states[i]!, this.target, GRID);
    });
    const vals = Object.values(after);
    this.result = { before: this.before, after, mean: vals.reduce((a, b) => a + b, 0) / vals.length };
    this.stage = 2;
  }

  destroy(): void {
    for (const rb of this.read) rb.destroy();
    this.grow.destroy();
    for (const s of this.cut) s.destroy();
  }
}
